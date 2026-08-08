export interface RegisterSkillsRequestBody {
  skills: { name: string }[]
}

export interface SkillResponseBodyItem {
  name: string
  skillId: string
}
