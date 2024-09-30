// https://www.compass-group.fi/en/ravintolat-ja-ruokalistat/amica/kaupungit/oulu/alwari/ alwari
// https://fi.jamix.cloud/apps/menu/?anro=93077&k=49&mt=111 mara 
// https://fi.jamix.cloud/apps/menu/?anro=93077&k=70&mt=118 kerttu (kastari)
// https://fi.jamix.cloud/apps/menu/?anro=93077&k=70&mt=119 voltti (kylymä)
// https://mealdoo.com/week/uniresta/lipasto/ravintolalipasto?date=2024-09-30&lang=en&theme=light--light-green lipasto (napa)
// https://mealdoo.com/week/uniresta/julinia/ravintolajulinia?date=2024-09-30&lang=en&theme=light--green julinia (foobar)

const puppeteer = require('puppeteer')
const now = new Date();

const makeSs = async() =>{
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    await page.goto("https://fi.jamix.cloud/apps/menu/?anro=93077&k=49&mt=111");
    await page.waitForSelector()
    await page.screenshot({path: 'exemple.png'})
    await browser.close()
}


(async () => {
    // Launch the browser
    const browser = await puppeteer.launch({ headless: false }); // Set headless to true if you don't want to see the browser
    const page = await browser.newPage();

    // Go to the page where the buttons are located
    await page.goto('https://fi.jamix.cloud/apps/menu/?anro=93077&k=49&mt=111'); // Replace with the actual URL

    // Wait for the buttons to be visible
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

    await page.waitForSelector('div.v-button.v-widget.language.v-button-language');

    await page.screenshot({path: 'ex.png'})

    // Close the browser
    await browser.close();
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


