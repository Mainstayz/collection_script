import * as async from 'async'
import axios from 'axios'
import * as cheerio from 'cheerio'
import * as csv_parse from 'csv-parse'
import * as stringify from 'csv-stringify'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import * as _ from 'lodash'
import { join } from 'path'
import { ManagerData, ManagerDetails } from './models'

function writeCSVFile(data: any, file: string) {
    stringify(
        data,
        {
            header: true,
            columns: [
                'uid',
                'name',
                'score',
                'experience',
                'combat',
                'defense',
                'stability',
                'position',
                'annualReturn',
                'goodAt',
                'hoppingRate',
                'workDay',
            ],
            quoted_string: true,
        },
        (err, output) => {
            writeFileSync(join(__dirname, file), output)
        },
    )
}

async function clearData() {
    const result = []
    const filePath = join(__dirname, 'fund_manager_detail.csv')
    if (existsSync(filePath)) {
        const csv = readFileSync(filePath)
        const records = csv_parse(csv, {
            fromLine: 2,
        })
        for await (const record of records) {
            if (record[9] === '' || record[9] === '--') {
                continue
            }
            result.push(record)
        }

        writeCSVFile(result, 'fund_manager_detail_clear.csv')
        return true
    }
    return false
}

async function main() {
    const exist = await clearData()
    if (exist) {
        return
    }
    const csv = readFileSync(join(__dirname, 'fund_manager.csv'))
    let managers: ManagerData[] = []
    const records = csv_parse(csv, {
        fromLine: 2,
    })
    for await (const record of records) {
        const workDay = parseFloat(record[3])
        // 少于三年的
        if (workDay < 365 * 3) {
            continue
        }
        const model: ManagerData = {
            uid: record[0],
            name: record[1],
            fundCodes: record[2],
            workDay: parseFloat(record[3]),
            return: parseFloat(record[4]),
            optimal: record[5],
            optimalName: record[6],
        }
        managers.push(model)
    }
    // 排序
    managers = _.chain(managers).sortBy(['workDay', 'return']).reverse().value()

    const result = []
    let times = 0
    await async.mapLimit(managers, 1, async (item, cb) => {
        const url = `https://www.howbuy.com/fund/manager/${item.uid}`
        times++
        console.log(`还剩余 ${managers.length - times}`)
        try {
            const response = await axios.get(url)
            const $ = cheerio.load(response.data)

            const scoreElement = $(
                'body > div.gray-wrapper > div > div.file_top_box.clearfix > div.file_top_left.fl.clearfix > div.manager_info_right.fl > ul > li.first.score_fat > span.score',
            )
            if (!scoreElement) {
                console.log(`暂无 ${item.uid} ${item.name} 相关资料、或已离任`)
                return
            }
            const info: ManagerDetails = {
                uid: item.uid,
                name: item.name,
                score: parseFloat(scoreElement.text()),
                experience: parseFloat(
                    $('#experience > div.manager_pub_title > div > span').text(),
                ),
                combat: parseFloat($('#combat > div.manager_pub_title > div > span').text()),
                defense: parseFloat($('#defense > div.manager_pub_title > div > span').text()),
                stability: parseFloat($('#stability > div.manager_pub_title > div > span').text()),
                position: parseFloat($('#love > div.manager_pub_title > div > span').text()),
                annualReturn: parseFloat(
                    $(
                        '#experience > div.content.clearfix > div.content_m.fl > table > tbody > tr:nth-child(3) > td:nth-child(4) > span',
                    ).text(),
                ),
                goodAt: $(
                    'body > div.gray-wrapper > div > div.file_top_box.clearfix > div.file_top_left.fl.clearfix > div.manager_info_right.fl > ul > li:nth-child(3) > span',
                ).text(),
                hoppingRate: parseFloat(
                    $(
                        '#experience > div.content.clearfix > div.content_m.fl > table > tbody > tr:nth-child(2) > td:nth-child(4)',
                    ).text(),
                ),
                workDay: item.workDay,
            }
            result.push(info)
        } catch (error) {
            console.log(error)
        } finally {
            cb()
        }
    })

    stringify(
        result,
        {
            header: true,
            columns: [
                'uid',
                'name',
                'score',
                'experience',
                'combat',
                'defense',
                'stability',
                'position',
                'annualReturn',
                'goodAt',
                'hoppingRate',
                'workDay',
            ],
            quoted_string: true,
        },
        (err, output) => {
            writeFileSync(join(__dirname, 'fund_manager_detail.csv'), output)
        },
    )
}

main()
