// https://www.compass-group.fi/en/ravintolat-ja-ruokalistat/amica/kaupungit/oulu/alwari/ alwari
// https://fi.jamix.cloud/apps/menu/?anro=93077&k=49&mt=111 mara 
// https://fi.jamix.cloud/apps/menu/?anro=93077&k=70&mt=118 kerttu (kastari)
// https://fi.jamix.cloud/apps/menu/?anro=93077&k=70&mt=119 voltti (kylymä)
// https://mealdoo.com/week/uniresta/lipasto/ravintolalipasto?date=2024-09-30&lang=en&theme=light--light-green lipasto (napa)
// https://mealdoo.com/week/uniresta/julinia/ravintolajulinia?date=2024-09-30&lang=en&theme=light--green julinia (foobar)

const puppeteer = require('puppeteer')
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
    return menuData
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
            topicObj.meals.push(newObj);
        }
    
        newArr.push(topicObj);
        topics[i].meals = topics[i].meals.filter(item => item !== '');
    }

    newArr.forEach(element => {
        console.log(element);
    });
    
    
}

function getCurrentWeekday(){
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekday = daysOfWeek[now.getDay()]; // getDay() возвращает число от 0 (воскресенье) до 6 (суббота)

    return weekday
}

function getCurrentDate(){
    //Получение текущей даты
    const date = now.getDate(); // День месяца (1-31)
    const month = now.getMonth() + 1; // Месяц (0-11, где 0 — это январь, поэтому прибавляем 1)
    const year = now.getFullYear(); // Полный год

    let formattedDate = [month, date, year - 2000]
    return formattedDate
}

async function getWebsiteDate(page){
    const menuDateElement = await page.$("div.v-label.v-widget.sub-title.v-label-sub-title.v-has-width")
    const textDate = await page.evaluate(span => span.textContent.trim(), menuDateElement);

    let websiteDate = textDate.split(" ");
    websiteDate = websiteDate[1].split("/").map(n => Number(n)) //website date

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
        console.log("i have no idea what to do in this case")
    }
    
    await delay(1000)

    console.log(systemDate)
    console.log(websiteDate)
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
            console.log('Clicked the English button');
            break; // Exit the loop once the button is clicked
        }
    }

    await delay(1000);
}

(async () => {
    let weekday = getCurrentWeekday();

    if(weekday != 'Saturday' && weekday != 'Sunday'){
        // Launch the browser
    const browser = await puppeteer.launch({ headless: false }); // Set headless to true if you don't want to see the browser
    const page = await browser.newPage();
    
    //mara
    await page.goto('https://fi.jamix.cloud/apps/menu/?anro=93077&k=49&mt=111');
    await changeLang(page)
    await navigateToDate(page)
    const maraArray = await getDataForJamix(page)
    //kerttu
    await page.goto('https://fi.jamix.cloud/apps/menu/?anro=93077&k=70&mt=118');
    await changeLang(page)
    await navigateToDate(page)
    const kerttuArray = await getDataForJamix(page)
    //voltti
    await page.goto('https://fi.jamix.cloud/apps/menu/?anro=93077&k=70&mt=119');
    await changeLang(page)
    await navigateToDate(page)
    const volttiArray = await getDataForJamix(page)
    //lipasto
    let todaysDate = getCurrentDate(); 
    let formattedDate = `${todaysDate[2] + 2000}-${todaysDate[0]}-${todaysDate[1]}`     //should be 2024-09-30
    await page.goto(`https://mealdoo.com/week/uniresta/lipasto/ravintolalipasto?date=${formattedDate}&lang=en&openAll=false&theme=light--light-green`);
    await getDataForUniresta(page)
    //julinia
    await page.goto(`https://mealdoo.com/week/uniresta/julinia/ravintolajulinia?date=${formattedDate}&lang=en&openAll=false&theme=light--green`);
    await getDataForUniresta(page)
    await browser.close();
    console.log("MARA TODAY:")
    for(const item of maraArray){
        console.log(item)
    }
    console.log("\n\nKERTTU TODAY:")
    for (const item of kerttuArray){
        console.log(item)

    }
    console.log("\n\n\nVOLTTI TODAY:")
    for (const item of volttiArray){
        console.log(item)

    }
    }else{
        console.log('sorry, not today')
    }
    
})();

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


