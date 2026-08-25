import type {Stats} from "./stats";
export type Element="Aero"|"Glacio"|"Electro"|"Fusion"|"Havoc"|"Spectro";
export type WeaponType="Sword"|"Broadblade"|"Pistols"|"Gauntlets"|"Rectifier";
export type AttackType="Basic"|"Heavy"|"Skill"|"Liberation"|"Intro"|"Outro"|"Echo";
export type ScalingStat="ATK"|"HP"|"DEF";
export interface Attack{id:string;name:string;type:AttackType;element:Element;scalingStat:ScalingStat;multipliers:number[];skillLevel:number;}
export interface Skill{id:string;name:string;attacks:Attack[];}
export interface Character{id:string;name:string;element:Element;weaponType:WeaponType;baseStats:Stats;skills:Skill[];}
export interface Weapon{id:string;name:string;baseAtk:number;stats:Partial<Stats>;}
export interface Echo{id:string;name:string;cost:number;stats:Partial<Stats>;effects:string[];}
export interface Buff{id:string;name:string;source:string;description:string;stats:Partial<Stats>;}
export interface Enemy{id:string;name:string;level:number;baseRes:number;damageReduction:number;elementReduction:number;}
export interface RotationAttack{id:string;attackId:string;activeBuffIds:string[];}
export interface PartyMemberConfig{characterId:string;weaponId:string;echoIds:string[];}
export interface PartyConfig{id:string;name:string;mainDps:PartyMemberConfig;subDps:PartyMemberConfig;support:PartyMemberConfig;rotation:RotationAttack[];enemyId:string;}
export interface PartyTemplate{id:string;name:string;description:string;config:PartyConfig;}