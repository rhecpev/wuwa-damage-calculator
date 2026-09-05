# API 데이터 → 계산 엔진 반영 절차

encore.moe API v2에서 받은 원본을 앱이 쓰는 데이터로 옮기는 작업 템플릿.
새 무기·캐릭터를 추가하거나 기존 데이터를 갱신할 때 이 순서를 그대로 따른다.

---

## 0. 파일이 두 종류로 나뉘어 있다

이 구분을 어기면 작업이 날아간다.

| 종류 | 파일 | 성격 |
|---|---|---|
| **자동 생성** | `api/*.json` | API 원본 덤프. 손으로 고치지 않는다. |
| **자동 생성** | `src/data/weapons.json` | 덤프에서 추린 것. `build-weapons.mjs`가 **통째로 덮어쓴다.** |
| **손으로 작성** | `src/data/weaponBuffs.ts` | 무기 스킬 텍스트를 사람이 해석한 버프. 무기 id가 키. |
| **손으로 작성** | `src/data/characters/*.ts` | 캐릭터 정의 + `passiveBuffs`(공명체인 해석). |
| **자동 생성** | `src/data/echoAttacks.json` | 에코 어빌리티 피해 계수. `build-echo-attacks.mjs`가 **통째로 덮어쓴다.** |
| **손으로 작성** | `src/data/echoAttackOverrides.ts` | 위 자동 추출분을 사람이 고쳐 적은 것. 에코 id가 키. |

> 해석이 필요한 것은 전부 손으로 쓰는 파일에 둔다. 생성 파일에 적으면 다음 갱신 때 사라진다.

---

## 1. 원본 받기

```bash
node scripts/fetch-encore.mjs weapon            # api/weapons.json
node scripts/fetch-encore.mjs character         # api/characters.json
node scripts/fetch-encore.mjs character 1210    # 단건만
```

목록 엔드포인트를 받아 각 항목의 상세를 전부 받아온다(동시 6개, 3회 재시도).
`{ source, fetchedAt, count, items }` 형태로 저장된다.

리소스 이름은 `api/openapi.json`의 `paths`에 있다:
`weapon` `character` `echo` `monster` `item` `toa` `fotg` `whiwa` …

**엔드포인트가 계산에 쓸 값을 준다고 가정하지 말 것.** 예: `/monster`는
Id·Icon·Name·Rarity·ModelName만 주고 레벨·저항은 주지 않는다. 스키마를 먼저 확인한다.

---

## 2. 무기: 추린 데이터 생성

```bash
node scripts/build-weapons.mjs                  # api/weapons.json → src/data/weapons.json
```

스크립트가 처리하는 것과, 그 이유:

| 항목 | 처리 |
|---|---|
| `WeaponType` 숫자 | `1 대검 Broadblade / 2 직검 Sword / 3 권총 Pistols / 4 권갑 Gauntlets / 5 증폭기 Rectifier` |
| `QualityId` | 그대로 별 개수(1~5)로 쓴다. `QualityName`(R/SR/SSR)은 더 거친 분류라 안 쓴다. |
| `GrowthValues` | **96칸인데 최대 레벨은 90.** 돌파 전/후로 같은 레벨이 두 번 들어 있어 **뒤쪽(돌파 후)** 값을 쓴다. |
| `Properties[0]` | 기초 공격력 |
| `Properties[1]` | 부옵션. 이름 → `Stats` 키로 매핑 |
| `Desc` | HTML 제거. 정련 수치는 `"4%/6.2%/8.4%/10.6%/12.8%"` 처럼 슬래시로 붙어 있다 |
| `DescParams[].ArrayString` | 그 슬래시 묶음을 정련 1~5로 잘라둔 배열 |

부옵션 → `Stats` 매핑:

```
공격력 → atkPercent      크리티컬 → critRate      크리티컬 피해 → critDamage
방어력 → defPercent      HP → hpPercent           공명 효율 → 대응 필드 없음(null)
```

**매핑 없는 부옵션이 나오면 스크립트가 경고를 찍는다.** 무시하지 말고 `Stats`에
필드를 추가할지 결정한다. 현재 공명 효율 19종이 미매핑 상태다.

---

## 2-1. 에코 어빌리티 피해: 추린 데이터 생성

```bash
node scripts/build-echo-attacks.mjs              # echoDetails.json → src/data/echoAttacks.json
```

메인 슬롯(다섯 자리 중 첫 번째)에 낀 에코는 어빌리티를 쓸 수 있고, 그 피해가 계산에 들어간다.
계수는 `echoDetails.json`의 어빌리티 원문에만 있어서 문장에서 긁어낸다.

| 항목 | 처리 |
|---|---|
| 계수 | `"268.20%의 기류 피해"` — 퍼센트 뒤 30자 안에 「속성 + 피해」가 오는 것만 |
| 버프 문장 걸러내기 | 그 사이에 증가·감소·보너스·저항 같은 말이 끼면 버린다 |
| 깡수치 | `"48.00%+96의 기류 피해"` 의 `+96`. 뒤에 `%`가 또 오면(`553.60%+276.80%`) 계수 둘이다 |
| 타수 | 퍼센트 앞뒤의 `"3단"` · `"3회"` · `"두 번"` · `"매 단마다"`(+ 앞선 `"최대 N단"`) |
| 기준 스탯 | `"HP 최대치의 15.86%"` → HP, `"방어력의 N%"` → DEF, 그 외 공격력 |
| 물리 피해 | `Element`에 없어서 `DamageElement`(6속성 + 물리)를 따로 뒀다. 부스트 칸은 없다 |

스크립트가 **아예 빼는 에코**도 있다(`exclusionReason`). 뺀 것은 버리지 않고
`echoAttacks.json`의 `excluded`에 이유와 함께 남고, 에코 데미지 확인 탭 맨 위에서 펼쳐 볼 수 있다.

| 빼는 것 | 수 | 근거 |
|---|---|---|
| 새알심 | 12 | 금희·장리처럼 캐릭터 이름을 단 미니게임용. 본문에 「새알심」이 나오는 것이 정확히 이 12종이다 |
| 「이상 · XX」 중복 | 43 | 「이상 · 」만 떼면 같은 이름이 있고 **어빌리티 원문까지 글자 그대로 같은 것**. 원문이 다르면 남긴다 |

> 「이상 · 무망자」처럼 같은 이름이 여러 개인데 내용은 제각각인 경우가 있다.
> 그래서 이름만 보고 빼면 안 되고 반드시 원문을 대조한다 — 16종은 그렇게 살아남았다.

**원문은 사람이 읽으라고 쓴 문장이라 기계로 다 옮기지 못한다.** 애매한 것은
`review`에 이유가 적혀 공격 팔레트에 「검수 필요」로 그대로 뜬다. 실제로 걸리는 것들:

- 짧게/길게 누르기로 갈리는 어빌리티 → 실제로 쓴 쪽만 남겨야 하는데 자동 추출은 둘 다 더한다
- 사용 회차마다 계수가 다른 것(크라운리스) → 회차별로 나눠야 한다
- 반격·피격 조건(용비늘의 기축) → 세 갈래 중 하나만 들어가는데 셋을 다 더한다
- 「폐기물로 인한 피해는 반주 스킬 피해로 간주」류 → 어느 타격까지인지는 문장을 읽어야 안다

고친 결과는 `src/data/echoAttackOverrides.ts`에 적는다. 그 에코는 자동 추출분을
통째로 버리고 이 정의를 쓰며, 「검수 필요」 대신 고친 이유가 뜬다.

훑어보는 자리는 **에코 데미지 확인 탭**이다. 원문과 「계수를 뽑아낸 문장 조각」을 나란히
놓고 대조할 수 있고, 「검수 필요 / 고쳐 적음 / 그대로 쓰는 것」으로 걸러 볼 수 있다.

---

## 3. 스킬·버프 텍스트를 계산 가능한 형태로 옮기기

여기부터는 사람(=해석)의 일이다. 자동화하지 않는다.

### 3-1. 붙일 자리를 먼저 고른다 — `BuffTarget`

| target | 계산에서 붙는 곳 | 게임 표기 예 |
|---|---|---|
| `motionValue` | 스킬 계수 | "피해 배율이 N% 상승/증가" |
| `damageBonus` | 피해 증가 그룹 `(1+Σ)` | "속성 피해 보너스 N% 증가" |
| `boost` | 부스트 그룹 (피해증가와 **별개** 곱연산) | "피해가 N% 부스트" |
| `critRate` | 치명타 확률 | "크리티컬 N% 증가" |
| `critDamage` | 치명타 피해 (기본 100% 뺀 보너스분) | "크리티컬 피해 N% 증가" |
| `defIgnore` | 적 방어력 × (1-N) | "방어력 N% 무시" |
| `resPen` | 속성 저항 - N | "○○ 저항 N% 무시" |
| `damageTaken` | 받는피해 그룹 (독립 곱연산) | "목표가 받는 피해 N% 증가" |

**그룹을 잘못 고르면 숫자가 조용히 틀린다.** 피해 증가와 부스트와 받는피해는
서로 다른 곱연산 그룹이라, 같은 20%라도 결과가 다르다.

### 3-2. "상승"과 "증가"는 다르다 (`motionValue` 한정)

```
상승: 계수 × (1 + N)     — 곱연산
증가: 계수 + N           — 합연산(퍼센트포인트를 그대로 더한다)
```

500% 계수 + 25% → **상승 625% / 증가 525%**.
`modifier: "amplify"` = 상승, `"increase"` = 증가. 게임 텍스트의 두 글자를 그대로 따른다.

### 3-3. 조건을 붙인다

| 필드 | 뜻 |
|---|---|
| `damageType` | `"All"` \| AttackType \| Element. 어떤 공격에 걸리는지 |
| `attackId` | 특정 공격 하나만 지목 |
| `element` | `resPen`일 때 어느 속성 저항인지 |
| `resonanceChain` | 이 단계(0~6) 이상 보유해야 걸림 — 캐릭터 전용 |
| `resonanceMode` | 이 공명 모드일 때만 — 캐릭터 전용 |
| `stacks` | 스택 수. 적용치 = `value × stacks` |
| `condition` | 엔진이 판정 못 하는 발동 조건. **사람이 읽는 메모.** 화면에 표시됨 |

---

## 4. 함정 — 실제로 밟은 것들

### ① `attackId`를 쓰면 `damageType`은 `"All"`로

두 조건이 AND로 걸려서, 하나라도 어긋나면 버프가 **조용히 안 걸린다.**
공격을 이미 특정했으면 분류 조건은 열어둔다.

### ② `type` ≠ `damageBonusType`

`appliesTo()`는 **`damageBonusType ?? type`** 으로 판정한다. 둘이 다른 공격이 있다.

```
1004607_1 합주 · 등장    type=Chain   damageBonusType=Liberation
1004601_5 강공격 차지1    type=Heavy   damageBonusType=Liberation
```

- 합주를 `damageType:"Skill"`로 잡으면 **한 번도 안 걸린다** (실제로 밟음)
- 강공격을 `damageType:"Heavy"`로 잡아도 **안 걸린다**
- 반대로 `damageType:"Liberation"`은 공명해방 + 강공격 + 합주를 **전부** 잡는다

→ 애매하면 `attackId`로 지목한다. 옮기기 전에 대상 공격의 두 필드를 반드시 확인한다.

### ③ 같은 분류인데 값이 다른 경우

3체인은 종결 100% 상승, 과부하 40% 상승 — 둘 다 공명 해방이다.
분류로 잡으면 하나로 뭉개진다. 반드시 `attackId`로 나눈다.

### ④ 대상이 Attack으로 없으면 못 넣는다

「불꽃 효과」, 「조화 파동 피해」처럼 데이터에 공격으로 등록되지 않은 대상은
버프를 붙일 자리가 없다. **억지로 비슷한 공격에 붙이지 말고 미반영으로 남긴다.**

### ⑤ 못 옮긴 것은 파일에 이유와 함께 적는다

값이 없어서가 아니라 **구조가 없어서** 못 넣는 경우가 많다(덮어쓰기형 고정 크리티컬,
스택 메커니즘 등). 주석으로 남겨야 다음 세션이 다시 조사하지 않는다.
`src/data/characters/에이메스.ts` 하단의 "미반영" 블록이 예시다.

---

## 5. 검증

```bash
npx tsc -b --pretty false | grep -c "error TS"   # 기존 19건(EchoesPage/sampleData)보다 늘면 안 됨
npx vite build --outDir <임시경로> --emptyOutDir  # dist/ 덮어쓰지 말 것
```

숫자 검증은 손으로 한 번 돌려본다. 알려진 기준값:

| 항목 | 값 |
|---|---|
| 방어 배율 (캐릭터 90 / 적 100 / 방무 0%) | `1520 / (1520+1592)` = 0.4884318766 |
| 방어 배율 (같은 조건 / 방무 64%) | `1520 / (1520+1592×0.36)` = 0.7261886562 |
| 속성 저항 (저항 10%, 관통 0%) | 0.9 |
| 속성 저항 (저항 10%, 관통 30% → -20%) | 1.1 (`1 - r/2` 구간) |
| 배율 상승/증가 | 500% + 25% → 상승 625%, 증가 525% |

UI 확인은 **캐릭터 관리 탭 → 캐릭터 선택 → 공명체인 · 고유 버프** 패널에서 한다.
체인 단계·모드를 바꿔가며 어떤 버프가 켜지는지 한눈에 보인다.

---

## 6. 참고 위치

```
scripts/fetch-encore.mjs        API 원본 받기
scripts/build-weapons.mjs       무기 데이터 생성
scripts/build-echo-attacks.mjs  에코 어빌리티 피해 계수 추출
src/data/echoAttacks.ts         위 결과 + 손수정본을 공격(Attack)으로 변환
src/calculator/damage.ts        최종 데미지 공식
src/calculator/manualBuffs.ts   appliesTo() 판정 + BuffTarget 적용 분기
src/calculator/equippedBuffs.ts 무기·캐릭터 버프 자동 편입
src/types/game.ts               ManualBuff / CharacterBuffTemplate / BuffTarget
src/types/stats.ts              Stats 필드 목록
api/openapi.json                엔드포인트·스키마 원본
docs/조화도-이상-대미지-공식.md   조화도 파괴 · 이상 효과 공식(아직 엔진에 없음)
api/phro/*.json                 위 공식의 원본 덤프(phro.love)
```
