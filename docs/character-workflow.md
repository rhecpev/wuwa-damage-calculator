# 새 캐릭터 추가 워크플로우

encore.moe API의 캐릭터 원본을 `src/data/characters/<이름>.ts` 하나로 옮기는 절차.
`에이메스.ts`가 가장 완성도 높은 예시이므로, 막히면 그 파일을 먼저 열어본다.

> API 받는 법·무기 데이터·버프 해석 규칙은 [`api-data-workflow.md`](./api-data-workflow.md) 참고.

---

## 0. 파일 하나만 만들면 된다

```bash
node scripts/fetch-encore.mjs character 1210    # api/characters.json (단건)
```

`src/data/characters/<이름>.ts` 를 만들고 `Character` 객체를 **named export** 하면 끝이다.
`sampleData.ts`가 `import.meta.glob("./characters/*.ts")`로 자동 수집하므로
**어디에도 등록할 필요가 없다.** 파일 이름은 한글이어도 된다.

```ts
export const aimes: Character = { id: "aimes", ... };
```

> `Character.id`는 **API 숫자 id(1210)가 아니라 영문 슬러그**를 쓴다(`aimes`, `cartethyia`).
> `characterWeapons` / `characterChains` 등 저장소 키가 전부 이 값이다.

---

## 1. 원본에서 읽을 곳

| 만들 것 | API 필드 |
|---|---|
| `element` / `weaponType` | `ElementName` / `WeaponType`(숫자) |
| `baseStats` | `Properties[].GrowthValues` 중 level 90 |
| `skills[]` | `Skills[]` (10개) |
| `skills[].attacks[]` | **`Skills[].SkillAttributes`** (값·타수 전부) · `DamageList`는 판정 확인용 |
| `resonanceModes` | `SkillBranches[]`, 기본값은 `DefaultSkillBranchId` |
| `passiveBuffs` | `ResonantChain[]` (6개) |
| `iconUrl` / `artUrl` | `RoleHeadIcon` 계열 URL (다운로드하지 말고 URL만 저장) |

---

## 2. `baseStats`

`Properties`는 6개(HP · 공격력 · 방어력 · 크리티컬 · 크리티컬 피해 · 조화도 파괴 증폭)이고,
각각 `GrowthValues` 96칸을 갖는다. **level 90의 `value`를 쓴다.**

```ts
const baseStats = {
  ...emptyStats(),
  hp: 11025,
  atk: 425,
  def: 1148.89,
  critRate: 0.05,     // API "5%"
  critDamage: 0.5,    // API "150%" - 기본 100%
};
```

**주의할 점 3개:**

- 캐릭터 `GrowthValues`의 키는 **소문자** `{growthId, level, value}`다.
  무기 쪽은 대문자 `{Level, Value}`다. 스크립트를 돌려쓰면 여기서 깨진다.
- 크리티컬 계열만 `"5%"` 같은 **문자열**이고 나머지는 숫자다.
- **`critDamage`는 표시값에서 100%를 뺀 보너스분만 담는다.** `150%` → `0.5`.
  이걸 `1.5`로 넣으면 데미지가 통째로 어긋난다.
- `조화도 파괴 증폭`은 `Stats`에 대응 필드가 없다. 버린다.

---

## 3. `skills[]` — 분류와 아이콘

`Skills[].SkillType`(한글)을 `SkillCategory`로 옮긴다. 공격 팔레트의 구역이 이 값으로 갈린다.

| API `SkillType` | `SkillCategory` |
|---|---|
| 기본 공격 | `Basic` |
| 공명 스킬 | `Skill` |
| 공명 회로 | `Circuit` |
| 공명 해방 | `Liberation` |
| 변주 스킬 | `Variation` |
| 반주 스킬 | `Intro` |
| 조화도 파괴 | `Sync` |
| 고유 스킬 | `Passive` |

`icon`은 `Skills[].Icon` URL을 그대로. 공격 팔레트 구역 머리에 이 아이콘이 뜬다.
`attributes`에는 `SkillAttributes`를 **원본 그대로** 보존한다(레벨 20개 전부). 표시용이다.

---

## 4. `attacks[]` — 여기가 핵심

**`SkillAttributes[]` 하나만 보고 만든다.** 값도 타수도 전부 여기서 나온다.

| 배열 | 쓰임 |
|---|---|
| `SkillAttributes[]` | **hits 전부** — 레벨별 값과 히트 개수 |
| `DamageList[]` | `damageBonusType`(`Type`)과 `scalingStat`(`PropertyName`) 확인용 |

> **`DamageList`로 hits를 만들면 안 된다.** 단근으로 실제 대조한 결과:
>
> | 항목 | 속성표 `*N` | `DamageList` 엔트리 |
> |---|---|---|
> | 강공격 | **3** | 1 |
> | 주식 2단 | **2** | 1 |
> | 연속 공격 | **8** | 2 |
> | 격수 | **4** | 2 |
> | 혼란 | **7** | 4 |
> | 풀 에너지 혼란 · 분락 | **7 / 1** | **아예 없음** |
>
> 타수가 안 맞을 뿐 아니라 **순서도 다르고**(기본 공격은 1단 → 강공격 → 3단 → 공중 순),
> **엔트리가 없는 공격도 있다.** 두 배열을 짝지어 읽으면 배율이 통째로 어긋난다.
> `DamageList`는 히트박스·연출 단위이고, 게임 스킬 설명에 뜨는 배율은 `SkillAttributes`다.

### 4-1. `hits` 만들기

`hits[히트번호][스킬레벨-1]` = 그 히트의 그 레벨 배율(소수).

**규칙은 셋뿐이다.**

1. `values`의 **앞 10개만** 쓴다 (20개가 오지만 스킬 레벨은 1~10이다).
2. `"32.40%"` → `0.324` 로 바꾼다 (÷100).
3. 히트를 펼친다 — `*N`이면 **같은 줄을 N번**, `+`면 각 값이 **한 줄씩**.

```
"주식 1단 피해" = "32.40%*2"        → 같은 줄 2개
"2단 피해"      = "6.99%+10.48%"    → 서로 다른 줄 2개
```

```ts
// SkillAttributes: 주식 1단 피해 = "32.40%*2"
//   values[0..9] = 32.40, 35.06, 37.72, 41.44, 44.09, 47.15, 51.40, 55.65, 59.90, 64.42
hits: [
  [0.324, 0.3506, 0.3772, 0.4144, 0.4409, 0.4715, 0.514, 0.5565, 0.599, 0.6442],
  [0.324, 0.3506, 0.3772, 0.4144, 0.4409, 0.4715, 0.514, 0.5565, 0.599, 0.6442],
]
```

- 히트를 나눠 담는 이유: 게임처럼 히트마다 크리티컬이 독립 판정되는 구조를 그대로
  반영하면서, 결과는 "2단" 하나로 묶여 나오게 하기 위해서다.
- **`values`가 20개인 것에 속지 마라.** 20개를 그대로 넣으면 `skillLevel: 10`이
  엉뚱한 값을 가리킨다.
- 쿨타임·지속시간처럼 `%`가 없는 항목은 공격이 아니다. 건너뛴다.

### 4-2. `type` 과 `damageBonusType`

**둘은 다른 것이다. 이 구분을 놓치면 버프가 조용히 안 걸린다.**

- `type` = **모션 분류**. 공격 이름이 「강공격 · …」이면 `Heavy`, 「공중 공격」이면 `Aerial`.
  UI 그룹핑에 쓴다.
- `damageBonusType` = **실제 피해 판정**. `DamageList[].Type`이 알려준다.
  어떤 "○○ 피해 보너스" 스탯이 붙는지를 결정한다.

에이메스에서 실제로 갈린 예:

| 공격 | `type` | `DamageList.Type` → `damageBonusType` |
|---|---|---|
| 강공격 · 차지 1/2단계 | `Heavy` | **`Liberation`** |
| 공중 공격 / 회피 반격 | `Aerial` / `DodgeCounter` | **`Basic`** |
| 합주 · 등장/강림 | `Chain` | **`Liberation`** |
| 일반 공격 메카스카우트 2단 | `Basic` | **`Liberation`** |

`DamageList.Type`이 `type`과 같으면 `damageBonusType`은 **생략한다**(기본이 `type`).

> **그 공격의 `DamageList` 엔트리가 없을 수도 있다**(단근의 풀 에너지 혼란·분락).
> 그때는 스킬 종류와 공격 이름으로 판단해 적는다 — 「강공격 · …」이면 `type: "Heavy"`,
> 피해 판정이 다르다고 볼 근거가 없으면 `damageBonusType`은 생략한다.

`DamageList.Type`에 `「조화 파동 · 이탈」` 같은 상태 이름이 오기도 한다.
`AttackType`에 대응이 없으면 억지로 끼우지 말고, 그 공격을 등록하지 않거나 주석으로 남긴다.

### 4-3. 나머지 필드

| 필드 | 출처 |
|---|---|
| `id` | `"<SkillId>_<순번>"` — 예 `"1004601_1"`. 버프의 `attackId`가 이 값을 참조한다 |
| `name` | `SkillAttributes.attributeName` 그대로. 헷갈리면 다듬어도 된다(단근은 「스킬 피해」→「격수 피해」, 「풀 에너지 혼란 피해」→「강공격 · 혼란 피해(풀 에너지)」) |
| `element` | 캐릭터 속성. 단 `damageBonusType`을 쓴 공격은 생략된 경우가 있으니 기존 파일 관례를 따른다 |
| `scalingStat` | `DamageList.PropertyName` — `공격력`→`ATK`, `HP`→`HP`, `방어력`→`DEF`. 엔트리가 없으면 그 스킬의 다른 엔트리를 따른다 |
| `skillLevel` | 보통 `10` (만렙) |
| `resonanceMode` | 특정 모드에서만 나오는 공격이면 지정 |
| `fixedDamage` | 배율과 무관하게 더해지는 고정 피해가 있을 때만 |

---

## 4-4. `SkillTree` — 스킬 트리 노드는 그냥 켜서 넣는다

`SkillTree[]`는 노드 8개짜리 고정 스탯 보너스다. 만렙이면 항상 켜져 있으므로
조건 없이 **`baseStats`에 그대로 합친다.** 버프로 만들지 않는다.

`PropertyNodeDescribe`를 읽어 합산한다. 보통 두 종류가 4개씩 (`1.80 ×2 + 4.20 ×2 = 12%`).

```ts
const skillTreeStats = {
  atkPercent: 0.12,        // 공격력 1.80+1.80+4.20+4.20
  havocDamageBonus: 0.12,  // 인멸 피해 보너스 1.80+1.80+4.20+4.20
};

const baseStats = {
  ...emptyStats(),
  atk: 262.5,
  critRate: 0.05,
  atkPercent: skillTreeStats.atkPercent,
  havocDamageBonus: skillTreeStats.havocDamageBonus,
};
```

**크리티컬처럼 `baseStats`에 이미 값이 있는 항목은 더해서 넣는다.**
에이메스는 기본 5% + 스킬 트리 8% = `critRate: 0.13`이다.
덮어쓰면 기본값이 사라진다.

노드 이름 → `Stats` 키: `공격력 증가`→`atkPercent`, `크리티컬 증가`→`critRate`,
`크리티컬 피해 증가`→`critDamage`, `○○ 피해 보너스 증가`→`<속성>DamageBonus`.

---

## 5. `resonanceModes` — 모드가 있는 캐릭터만

`SkillBranches[]`가 있으면 모드 캐릭터다. `DefaultSkillBranchId`가 가리키는 것이 기본 모드이며,
**배열 첫 번째 값이 기본 모드**가 되도록 순서를 맞춘다.

```ts
resonanceModes: ["Discord", "Flame"],   // 조화 파동 / 불꽃
```

모드가 없는 캐릭터는 필드 자체를 생략한다(UI가 이 값이 있을 때만 모드 선택을 띄운다).

---

## 6. `passiveBuffs` — 공명체인 해석

`ResonantChain[]` 6개의 `AttributesDescription`(HTML)을 읽고, 계산 가능한 것만 옮긴다.
필드 의미와 `BuffTarget` 표, 상승/증가 구분은 [`api-data-workflow.md` 3~4장](./api-data-workflow.md)에 있다.

캐릭터 전용 조건 두 개:

```ts
resonanceChain: 3,          // 3체인 이상 보유해야 걸림 (0~6)
resonanceMode: "Discord",   // 이 모드일 때만
```

**체크리스트:**

- [ ] 같은 분류인데 값이 다르면(`종결 100%` / `과부하 40%`) 반드시 `attackId`로 나눈다
- [ ] `attackId`를 쓰면 `damageType`은 `"All"`로 둔다 (조건 이중 걸림 방지)
- [ ] `damageType`으로 잡을 땐 대상 공격의 `damageBonusType`을 확인한다 (4-2 참고)
- [ ] 못 옮긴 효과는 **이유와 함께** 파일 하단에 주석으로 남긴다

`chainEffects`는 별개 필드다. 계산 가능한 **고정 스탯 보너스**만 담는 옛 구조이고,
조건부·스택형은 `passiveBuffs` 쪽으로 간다. 지금은 대부분 비어 있다.

---

## 7. 검증

```bash
npx tsc -b --pretty false | grep -c "error TS"    # 기존 19건보다 늘면 안 됨
npm run dev
```

화면에서 순서대로 확인한다.

1. **캐릭터 관리** → 카드가 뜨는가 (`import.meta.glob` 자동 수집 확인)
2. **캐릭터 관리 → 무기 설정** → 후보가 뜨는가
   → 안 뜨면 `weaponType` 오타. 0개면 조용히 비어 보인다
3. **캐릭터 관리 → 공명체인 · 고유 버프** → 체인 0~6을 눌러가며 버프가 켜지는지
   → 모드 칩이 붙은 버프는 모드를 바꿔 확인
4. **계산 탭 → 공격 추가** → 구역(일반/공명스킬/…)이 제대로 갈렸는가 = `SkillCategory` 확인
5. 공격을 로테이션에 담고 **카드 클릭 → 이 공격에 적용할 버프**
   → 걸려야 할 버프가 흐리게(`이 공격엔 해당 없음`) 나오면 **4-2의 `damageBonusType` 문제**다

손계산 대조용 기준값(에이메스 · 무기/에코 없음 · 몬스터 Lv100 인멸):

| 공격 | 기대 피해 |
|---|---|
| 일반 공격 1단 (배율 46.35%, ATK 425) | 88.76 |

---

## 8. 자주 밟는 함정 요약

1. **`critDamage`에 표시값을 그대로 넣기** → `150%`는 `0.5`다
2. **`GrowthValues` 키 대소문자** — 캐릭터는 소문자, 무기는 대문자
3. **`hits`에 20레벨 전부 넣기** → 10개만. `skillLevel`이 엉뚱한 칸을 가리킨다
4. **`damageBonusType` 누락** → 버프·피해보너스가 조용히 안 붙는다. 가장 찾기 어렵다
5. **`Character.id`에 API 숫자 id 쓰기** → 슬러그를 쓴다
6. **`*3` 표기를 히트 1개로 처리** → 히트 3개로 펼친다
7. **`DamageList` 엔트리 수로 히트를 세기** → 합쳐져 있을 수 있다. `SkillAttributes`가 기준
8. **`SkillTree` 8노드를 통째로 빠뜨리기** → 공격력 12% + 속성피증 12%가 통으로 빠진다

---

## 9. 지금 규약 (2026-08 갱신)

앞 절과 어긋나는 부분은 **이쪽이 맞다.**

### 원본 받기

```bash
node scripts/fetch-character.mjs <apiId> <슬러그>   # 예: 1409 cartethyia
```

`api/characters/<apiId>.json`에 저장하고 `src/data/characterApiIds.json`(슬러그↔id 지도)에
등록한다. 아래 세 스크립트가 이 지도만 보고 돌므로 스크립트를 고칠 일이 없다.

### baseStats에 넣지 않는 것

- **스킬 트리 스탯 노드**(공격력 12% 등)를 baseStats에 더하지 않는다.
  `characterNodes.json`이 노드 8개를 따로 들고 있고, 켜고 끈 결과를 계산이 합산한다.
- baseStats는 **HP · 공격력 · 방어력 · 크리티컬 5% · 크리티컬 피해 50%** 만 적는다.
  (레벨별 수치는 `characterStats.json`이 담당하므로 여기 값은 Lv.90 기준 표시용이다.)

### passiveBuffs에 반드시 적을 것

| 필드 | 뜻 | 생략하면 |
|---|---|---|
| `uptime` | `"passive"` 상시 / `"active"` 조건부 | `condition`이 있으면 active |
| `scope` | `"self"` 본인만 / `"party"` 파티 전원 | **self** |
| `maxStacks` | 스택형이면 최대 스택(공격마다 고를 수 있게 된다) | 없음 |
| `exclusiveGroup` | 동시에 성립 못 하는 것끼리 같은 문자열 | 없음 |
| `attackIds` | 여러 공격에만 걸릴 때(`attackId`보다 우선) | 없음 |

- 상시(passive) 버프는 화면에서 **켜진 채 잠기고 늘 계산에 들어간다.**
- 파티에 거는 버프만 `scope: "party"`로 적는다. 안 적으면 남의 공격 목록에 안 뜬다.

### 마무리 — 이 순서로 돌린다

```bash
node scripts/build-character-stats.mjs    # 레벨별 HP/공격력/방어력
node scripts/build-character-nodes.mjs    # 스킬 트리 노드 8개
node scripts/build-character-chains.mjs   # 공명체인 6단계 이름·설명·아이콘
npx tsc -p tsconfig.app.json --noEmit     # 새 오류 0건인지
npx vite build
```

### 완료 표시 규칙

`docs/완료된-캐릭터.txt`가 **유일한 진행 기록**이다. 두 가지를 지킨다.

**1. 다 끝났을 때만 이름을 적는다.**

위 다섯 단계(원본 받기 → 파일 작성 → 세 스크립트 → 타입·빌드 통과 → 이름 추가)를
전부 마친 뒤에만 한 줄을 추가한다. 중간에 막히거나 검증이 실패하면 **적지 않는다.**
반쯤 만든 것을 완료로 적으면 다시는 손대지 않게 되어 조용히 틀린 데이터가 남는다.

**2. 목록에 없는데 파일이 있으면 지우고 다시 만든다.**

`src/data/characters/<이름>.ts`가 있는데 완료 목록에 그 이름이 없다면,
지난번 작업이 중간에 끊긴 것이다. **그 파일을 지우고 처음부터 다시 만든다.**
이어서 고치려 들지 않는다 — 어디까지 맞는지 알 수 없어서 대조 비용이 더 든다.

```bash
rm src/data/characters/<이름>.ts
# characterApiIds.json 의 슬러그 항목도 함께 지운 뒤 다시 시작한다
```

이 파일에 이름이 있는 캐릭터는 건너뛴다.

**3. 만들 수 없는 항목은 `docs/건너뛴-캐릭터.txt`로 보낸다.**

원본에 `Skills`가 비어 있으면 만들 도리가 없다. 목록에 이름만 있고 스킬 데이터가
없는 중복 항목이 실제로 있다 — 예: `1502 방랑자`는 `1501 방랑자 · 회절`과
스탯·공명체인이 완전히 같고 `Skills`가 0개다.

그런 항목은 완료 목록이 아니라 **건너뛰기 목록**에 이름을 적는다.
완료와 섞지 않아야 "다 만들었나"를 볼 때 헷갈리지 않는다.

```
다음 대상 = api/characters.json 순서 중
            완료된-캐릭터.txt 에도 없고 건너뛴-캐릭터.txt 에도 없는 첫 번째
```

건너뛴 항목은 `characterApiIds.json` 지도에도 넣지 않는다(파일이 없으므로).
