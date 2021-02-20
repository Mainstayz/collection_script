import * as async from 'async'
import axios from 'axios'
import * as csv from 'csv'
import { writeFileSync } from 'fs'
import { join } from 'path'

async function main() {
    type ManagerData = {
        uid: string
        name: string
        fundCodes: string[]
        workDay: number
        return: number
        optimal: string
        optimalName: string
    }
    const result: ManagerData[] = []

    // http://fund.eastmoney.com/Data/FundDataPortfolio_Interface.aspx?dt=14&mc=returnjson&ft=all&pn=50&pi=1&sc=abbname&st=asc
    let pages = new Array(50).fill(0).map((page, index) => {
        return `http://fund.eastmoney.com/Data/FundDataPortfolio_Interface.aspx?dt=14&mc=returnjson&ft=all&pn=50&pi=${
            index + 1
        }&sc=abbname&st=asc`
    })

    // const response = await axios()
    let times = 0
    await async.mapLimit(pages, 5, async (item, callback) => {
        times += 1
        console.log(`剩余 ${pages.length - times}`)
        const response = await axios.get(item)
        const returnObj = eval(response.data + ';returnjson;')
        for (const data of returnObj.data) {
            const model: ManagerData = {
                uid: data[0].toString(),
                name: data[1],
                fundCodes: data[4].toString(),
                workDay: parseFloat(data[6]),
                return: parseFloat(data[7]),
                optimal: data[8].toString(),
                optimalName: data[9].toString(),
            }
            result.push(model)
        }
        callback()
    })
    csv.stringify(
        result,
        {
            header: true,
            columns: ['uid', 'name', 'fundCodes', 'workDay', 'return', 'optimal', 'optimalName'],
            quoted_string: true,
        },
        (err, output) => {
            writeFileSync(join(__dirname, 'fund_manager.csv'), output)
        },
    )
}
main()
