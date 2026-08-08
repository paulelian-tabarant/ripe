export interface RegisterSkillsRequestBody {
  skills: Array<{ name: string }>
}

export interface SkillResponseBodyItem {
  name: string
  skillId: string
}
