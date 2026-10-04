export type AttributeKey = 'STR'|'CON'|'SIZ'|'DEX'|'APP'|'INT'|'POW'|'EDU';
export const ATTRIBUTE_KEYS: AttributeKey[] = ['STR','CON','SIZ','DEX','APP','INT','POW','EDU'];
export type Attributes = Record<AttributeKey,number>;
export interface SkillDefinition {id:string;name:string;english:string;base:number|'DEX/2'|'EDU'|'APP/5';category:string;eras?:string[]}
export interface Occupation {id:string;name:string;english:string;description:string;formula:{edu:number;other?:string[];factor?:number};credit:[number,number];skills:string[];choiceCount?:number;choiceGroups?:{name:string;count:number;options:string[]}[];skillNotes?:string;eras?:string[];sourceId:string}
export interface EquipmentDefinition {id:string;name:string;category:string;description:string;price:string;damage?:string;range?:string;attacks?:string;sourceId:string}
export interface SpellDefinition {id:string;name:string;description:string;cost:string;sourceId:string}
export interface Ruleset {id:string;name:string;english:string;era:string;description:string;sourceId:string;status:string;skillBaseOverrides?:Record<string,number>;skillAliases?:Record<string,string>}
export interface RuleData {version:string;sources:{id:string;title:string;url:string;note:string}[];rulesets:Ruleset[];skills:SkillDefinition[];occupations:Occupation[];equipment:EquipmentDefinition[];spells:SpellDefinition[]}
export interface SkillAllocation {occupation:number;personal:number;growth:number}
export interface InventoryItem {id:string;definitionId:string;name:string;quantity:number;notes:string;damage?:string;range?:string;attacks?:string}
export interface Character {id:string;name:string;player:string;occupationId:string;rulesetId:string;age:number;gender:string;birthplace:string;residence:string;portrait:string;attributes:Attributes;luck:number;current:{hp:number|null;mp:number|null;san:number|null};skills:Record<string,SkillAllocation>;occupationChoices:string[];inventory:InventoryItem[];spellIds:string[];backstory:{appearance:string;ideology:string;people:string;places:string;possessions:string;traits:string;injuries:string;phobias:string;notes:string};money:{cash:string;assets:string;spending:string};createdAt:string;updatedAt:string}
export interface CustomContent {rulesets:Ruleset[];skills:SkillDefinition[];occupations:Occupation[];equipment:EquipmentDefinition[];spells:SpellDefinition[]}
export interface Archive {schemaVersion:1;activeId:string;characters:Character[];custom:CustomContent}
