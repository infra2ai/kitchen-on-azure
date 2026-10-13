// Lists the next days a custom cake or catering order can be picked up, so
// the Orders agent can turn a day like "Saturday" into a date.
module.exports = async function (context, req) {
    const type = String(req.query.orderType || 'cake').toLowerCase();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(new Date());
    const dates = pickupDates(type).map((date) => ({
        date, weekday: new Date(date).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' }),
    }));
    context.res = { headers: { 'Content-Type': 'application/json' }, body: { today, orderType: type, dates } };
};

// Cakes need 5 days' notice, catering 3 working days. Pickups are Monday to Saturday.
function pickupDates(type) {
    const today = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(new Date()));
    const day = (d) => new Date(today.getTime() + d * 86400000);
    let first = 5;
    if (type === 'catering') {
        for (let workdays = 0, d = 1; ; d++) {
            if (day(d).getUTCDay() % 6 !== 0 && ++workdays === 3) { first = d; break; }
        }
    }
    const dates = [];
    for (let d = first; dates.length < 10; d++) {
        if (day(d).getUTCDay() !== 0) dates.push(day(d).toISOString().slice(0, 10));
    }
    return dates;
}
