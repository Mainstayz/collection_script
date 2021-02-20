export type ManagerDetails = {
    uid: string
    name: string
    score: number
    experience: number
    combat: number
    defense: number
    stability: number
    position: number
    annualReturn: number
    goodAt: string
    hoppingRate: number
    workDay: number
}

export type ManagerData = {
    uid: string
    name: string
    fundCodes: string[]
    workDay: number
    return: number
    optimal: string
    optimalName: string
}
