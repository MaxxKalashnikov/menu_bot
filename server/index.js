// https://www.compass-group.fi/en/ravintolat-ja-ruokalistat/amica/kaupungit/oulu/alwari/ alwari
// https://fi.jamix.cloud/apps/menu/?anro=93077&k=49&mt=111 mara 
// https://fi.jamix.cloud/apps/menu/?anro=93077&k=70&mt=118 kerttu (kastari)
// https://fi.jamix.cloud/apps/menu/?anro=93077&k=70&mt=119 voltti (kylymä)
// https://mealdoo.com/week/uniresta/lipasto/ravintolalipasto?date=2024-09-30&lang=en&theme=light--light-green lipasto (napa)
// https://mealdoo.com/week/uniresta/julinia/ravintolajulinia?date=2024-09-30&lang=en&theme=light--green julinia (foobar)

const puppeteer = require('puppeteer')
const express = require('express');
require('dotenv').config()

const menuRouter = express.Router();
const now = new Date();

function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time);
    });
}

const getDataForJamix = async(page) => {
    await page.waitForSelector('span.v-button-wrap');

    const menuItems = await page.$$('div.v-button.v-widget.multiline.v-button-multiline > span.v-button-wrap > .v-button-caption')
    let menuData = [];
    for (const item of menuItems) {
        const title = await item.$('span.multiline-button-caption-text')
        const dinnerOption = await page.evaluate(span => span.textContent.trim(), title);

        menuData.push({ dinnerOption, menuItems: [] });

        const subMenuItems = await item.$$('span.menu-item');
        
        for (let subItem of subMenuItems) {
            const menuItemText = await subItem.evaluate(el => el.innerText.trim());
            menuData[menuData.length - 1].menuItems.push(menuItemText);
        }

    }

    let dietArr = ["Mu", "*", "M", "G", "VEG", "L"];
    let newArr = []

    for (let i = 0; i < menuData.length; i++) {
        let topicObj = {
            topic: menuData[i].dinnerOption,
            meals: []               
        };
    
        for (let k = 0; k < menuData[i].menuItems.length; k++) {
            let newObj = {
                meal: "",  
                diets: []   
            };
    
            let currentMeal = menuData[i].menuItems[k];
    
            for (let j = 0; j < dietArr.length; j++) {
                let safeDiet = dietArr[j].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');  
                let regex = new RegExp(`\\b${safeDiet}\\b`, 'g');  
    
                if (regex.test(currentMeal)) {
                    if (!newObj.diets.includes(dietArr[j])) {
                        newObj.diets.push(dietArr[j]);
                    }
                    currentMeal = currentMeal.replace(regex, '').replace(/[,*]/g, '').trim();
                }
            }
    
            newObj.meal = currentMeal.charAt(0).toUpperCase() + currentMeal.slice(1);
            if (newObj.meal !== '') {
                topicObj.meals.push(newObj);
            }
        }
    
        if (topicObj.meals.length > 0) {
            newArr.push(topicObj);
        }

        menuData[i].menuItems = menuData[i].menuItems.filter(item => item !== '');
    }

    // newArr.forEach(element => {
    //     console.log(element)
    // });

    return newArr
}

async function getDataForUniresta(page){
    await page.waitForSelector('div.container__menu-day-date--current');
    await delay(2000);

    const expandedPanel = await page.$('mat-expansion-panel.public-menu-container-border[ng-reflect-expanded="true"]');
    const elements = await expandedPanel.$$('h2.header__menu-day-meal-option.ng-star-inserted, div.container__menu-day-row');

    let topics = [];
    let currentTopic = null;
    let currentMeals = [];

    for (const el of elements) {
        const tagName = await el.evaluate(el => el.tagName.toLowerCase());

        if (tagName === 'h2') {
            if (currentTopic !== null) {
                topics.push({ topic: currentTopic, meals: currentMeals });
            }
            
            currentTopic = await el.evaluate(el => el.textContent.trim());
            currentMeals = [];
        }

        if (tagName === 'div') {
            const mealText = await el.evaluate(el => el.textContent.trim());
            currentMeals.push(mealText.replace(/Carbon.*/g, '').replace(/\beco\b/g, '').replace(/Info\S*/g, '').replace(/\bKELA\b/g, '').trim());
        }
    }

    if (currentTopic !== null) {
        topics.push({ topic: currentTopic, meals: currentMeals });
    }

    let dietArr = ["Gluten free", "Lactose free", "Milk free", "Vegan", "Contains allergens"];
    let newArr = []

    for (let i = 0; i < topics.length; i++) {
        let topicObj = {
            topic: topics[i].topic, 
            meals: []               
        }; 
        for (let k = 0; k < topics[i].meals.length; k++) {
            let newObj = {
                meal: "",  
                diets: []   
            };
            for (let j = 0; j < dietArr.length; j++) {
                if (topics[i].meals[k].includes(dietArr[j])) {
                    let regex = new RegExp(dietArr[j], 'gi');
                    topics[i].meals[k] = topics[i].meals[k].replace(regex, '').trim();
                    newObj.diets.push(dietArr[j]);
                }
            }
            newObj.meal = topics[i].meals[k].charAt(0).toUpperCase() + topics[i].meals[k].slice(1);
            if (newObj.meal !== '') {
                topicObj.meals.push(newObj);
            }
        }
    
        if (topicObj.meals.length > 0) {
            newArr.push(topicObj);
        }
        topics[i].meals = topics[i].meals.filter(item => item !== '');
    }

    // newArr.forEach(element => {
    //     console.log(element);
    // });
    
    return newArr
}

function getCurrentWeekday(){
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekday = daysOfWeek[now.getDay()];

    return weekday
}

function getCurrentDate(){
    const date = now.getDate(); 
    const month = now.getMonth() + 1; 
    const year = now.getFullYear(); 

    let formattedDate = [month, date, year - 2000]
    return formattedDate
}

async function getWebsiteDate(page){
    const menuDateElement = await page.$("div.v-label.v-widget.sub-title.v-label-sub-title.v-has-width")
    const textDate = await page.evaluate(span => span.textContent.trim(), menuDateElement);
    let websiteDate = textDate.split(" ");
    websiteDate = websiteDate[1].split("/").map(n => Number(n)) //website date (in endlish change / to .)
    return websiteDate
}

async function navigateToDate(page){
    let systemDate = getCurrentDate(); //system date
    let websiteDate = await getWebsiteDate(page)
    const nextButton = await page.$("div.v-button.v-widget.date.v-button-date.date--next.v-button-date--next")
    const prevButton = await page.$("div.v-button.v-widget.date.v-button-date.date--previous.v-button-date--previous")

    if(systemDate[0] == websiteDate[0]){
        while(systemDate[1] > websiteDate[1]){ // 10 > 5
            await nextButton.click()
            await delay(1400)
            websiteDate = await getWebsiteDate(page)
        }
    }else {
        console.log("i have no idea what to do in this case, well probably i have an idea but its so not likely that this is going to happend that im not even going to emplement a solution for this because i simply dont have enough time, so mabe later...")
    }
    
    await delay(1000)
}

async function changeLang(page){
    await page.waitForSelector('div.v-button.v-widget.language.v-button-language');

    // Click the button with the text "English"
    const buttons = await page.$$('div.v-button.v-widget.language.v-button-language'); // Select all buttons

    for (const button of buttons) {
        const caption = await button.$('.v-button-caption'); // Get the caption span within the button
        const text = await page.evaluate(span => span.textContent.trim(), caption); // Get text content
        
        if (text === 'English') {
            await button.click(); // Click the button if text matches "English"
            break; // Exit the loop once the button is clicked
        }
    }

    await delay(1000);
}

const timeout = (ms) => new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Waiting time is over')), ms);
});

menuRouter.get('/getmenu', async (req, res) => {
    try {
        let weekday = getCurrentWeekday();

        if (weekday != 'Saturday' && weekday != 'Sunday') {

            const timeoutDuration = 40000; 

            const result = await Promise.race([

                (async () => {
                    // Launch the browser
                    const browser = await puppeteer.launch({ headless: true });
                    const page = await browser.newPage();
                    console.log('starting...');

                    //mara
                    await page.goto('https://fi.jamix.cloud/apps/menu/?anro=93077&k=49&mt=111');
                    await console.log('fetching mara...');
                    await changeLang(page);
                    await navigateToDate(page);
                    const maraArray = await getDataForJamix(page);
                    await console.log('mara fetched');

                    //kerttu
                    await page.goto('https://fi.jamix.cloud/apps/menu/?anro=93077&k=70&mt=118');
                    await console.log('fetching kerttu...');
                    await changeLang(page);
                    await navigateToDate(page);
                    const kerttuArray = await getDataForJamix(page);
                    await console.log('kerttu fetched');

                    //voltti
                    await page.goto('https://fi.jamix.cloud/apps/menu/?anro=93077&k=70&mt=119');
                    await console.log('fetching voltti...');
                    await changeLang(page);
                    await navigateToDate(page);
                    const volttiArray = await getDataForJamix(page);
                    await console.log('voltti fetched');

                    //lipasto
                    let todaysDate = getCurrentDate();
                    let formattedDate = `${todaysDate[2] + 2000}-${todaysDate[0]}-${todaysDate[1]}`; // 2024-09-30
                    await page.goto(`https://mealdoo.com/week/uniresta/lipasto/ravintolalipasto?date=${formattedDate}&lang=en&openAll=false&theme=light--light-green`);
                    await console.log('fetching lipasto...');
                    const lipArray = await getDataForUniresta(page);
                    await console.log('lipasto fetched');

                    //julinia
                    await page.goto(`https://mealdoo.com/week/uniresta/julinia/ravintolajulinia?date=${formattedDate}&lang=en&openAll=false&theme=light--green`);
                    await console.log('fetching julinia...');
                    const julArray = await getDataForUniresta(page);
                    await console.log('julinia fetched');

                    await browser.close();

                    const combinedArray = [
                        { name: "Mara", menuList: [...maraArray] },
                        { name: "Kerttu", menuList: [...kerttuArray] },
                        { name: "Voltti", menuList: [...volttiArray] },
                        { name: "Lipasto", menuList: [...lipArray] },
                        { name: "Julinia", menuList: [...julArray] }
                    ];

                    return combinedArray;
                })(),

                timeout(timeoutDuration) 
            ]);

            res.status(200).json(result);
        } else {
            console.log('not today');
            res.status(200).json({ menu: "No menu provided for weekends." });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: "error occured " + error.message });
    }
});

module.exports = {menuRouter}
// menuRouter.get('/getmenu', async(req, res) => {
//     try {
//         let weekday = getCurrentWeekday();

//         if(weekday != 'Satursday' && weekday != 'Sundsay'){
                
//         // Launch the browser
//         const browser = await puppeteer.launch({ headless: false }); 
//         const page = await browser.newPage();
//         console.log('starting...')
//         //mara
//         await page.goto('https://fi.jamix.cloud/apps/menu/?anro=93077&k=49&mt=111');
//         await console.log('fetching mara...')
//         await navigateToDate(page)
//         await changeLang(page)
//         const maraArray = await getDataForJamix(page)
//         await console.log('mara fetched')
//         //kerttu
//         await page.goto('https://fi.jamix.cloud/apps/menu/?anro=93077&k=70&mt=118');
//         await console.log('fetching kerttu...')
//         await navigateToDate(page)
//         await changeLang(page)
//         const kerttuArray = await getDataForJamix(page)
//         await console.log('kerttu fetched')
//         //voltti
//         await page.goto('https://fi.jamix.cloud/apps/menu/?anro=93077&k=70&mt=119');
//         await console.log('fetching voltti...')
//         await navigateToDate(page)
//         await changeLang(page)
//         const volttiArray = await getDataForJamix(page)
//         await console.log('voltti fetched')
//         //lipasto
//         let todaysDate = getCurrentDate(); 
//         let formattedDate = `${todaysDate[2] + 2000}-${todaysDate[0]}-${todaysDate[1]}`     //should be 2024-09-30
//         await page.goto(`https://mealdoo.com/week/uniresta/lipasto/ravintolalipasto?date=${formattedDate}&lang=en&openAll=false&theme=light--light-green`);
//         await console.log('fetching lipasto...')
//         const lipArray = await getDataForUniresta(page)
//         await console.log('lipasto fetched')
//         //julinia
//         await page.goto(`https://mealdoo.com/week/uniresta/julinia/ravintolajulinia?date=${formattedDate}&lang=en&openAll=false&theme=light--green`);
//         await console.log('fetching julinia...')
//         const julArray = await getDataForUniresta(page)
//         await console.log('julinia fetched')
//         await console.log("///////SUCCESS////////")
//         await browser.close();

//         const combinedArray = [
//             {
//                 name: "Mara",
//                 menuList: [...maraArray]
//             },
//             {
//                 name: "Kerttu",
//                 menuList: [...kerttuArray]
//             },
//             {
//                 name: "Voltti",
//                 menuList: [...volttiArray]
//             },
//             {
//                 name: "Lipasto",
//                 menuList: [...lipArray]
//             },
//             {
//                 name: "Julinia",
//                 menuList: [...julArray]
//             },
//         ]

//         res.status(200).json(combinedArray);
//         }else{
//             console.log('not today')
//             res.status(200).json({menu: "No menu provided for weekends."});
//         }
//     } catch (error) {
//         console.log(error)
//         res.status(200).json({ message: "Server does not respond with correct data or restaraunts do not work today. Check 'link' command."});
//     }
// })
// Получение текущей даты
// const date = now.getDate(); // День месяца (1-31)
// const month = now.getMonth() + 1; // Месяц (0-11, где 0 — это январь, поэтому прибавляем 1)
// const year = now.getFullYear(); // Полный год

// // Получение текущего времени
// const hours = now.getHours(); // Часы (0-23)
// const minutes = now.getMinutes(); // Минуты (0-59)
// const seconds = now.getSeconds(); // Секунды (0-59)

// // Получение дня недели
// const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// const weekday = daysOfWeek[now.getDay()]; // getDay() возвращает число от 0 (воскресенье) до 6 (суббота)

// // Форматирование даты и времени
// const formattedDate = `${date}/${month}/${year}`;
// const formattedTime = `${hours}:${minutes}:${seconds}`;

// console.log(`Date: ${formattedDate}`); // Например: "Date: 29/9/2024"
// console.log(`Time: ${formattedTime}`); // Например: "Time: 14:30:45"
// console.log(`Weekday: ${weekday}`); // Например: "Weekday: Sunday"


