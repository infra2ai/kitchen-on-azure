// Places a custom cake or catering order in the "orders" table.
// The bakery's rules live here, in code, so every order follows them.
// A confirmed order also goes on the "kitchen-tasks" queue, so the kitchen
// finds out straight away, without anyone checking the table (part 4).
module.exports = async function (context, req) {
    const order = req.body || {};
    const type = String(order.orderType || '').toLowerCase();
    const people = Number(order.people);
    const reply = (status, body) => { context.res = { status, headers: { 'Content-Type': 'application/json' }, body }; };

    const missing = ['customerName', 'orderType', 'item', 'people', 'pickupDate'].filter((k) => !order[k]);
    if (missing.length) return reply(400, { error: `Missing: ${missing.join(', ')}` });
    if (!['cake', 'catering'].includes(type)) return reply(400, { error: 'orderType must be cake or catering.' });
    if (type === 'cake' && people > 15) return reply(400, { error: 'Custom cakes are for up to 15 people. For more, order catering.' });
    if (type === 'catering' && people < 20) return reply(400, { error: 'Catering is for 20 people or more.' });
    if (!pickupDates(type).includes(order.pickupDate)) {
        return reply(400, { error: `We can't have this ready on ${order.pickupDate}. Choose a date from PickupDates.` });
    }

    // Big orders wait until a member of staff approves them.
    const status = people > 30 ? 'Waiting for staff approval' : 'Confirmed';
    const orderId = `BP-${1045 + context.bindings.orders.length}`;
    context.bindings.newOrder = {
        PartitionKey: 'orders', RowKey: orderId, Customer: order.customerName, Type: type,
        Item: order.item, People: people, PickupDate: order.pickupDate, Notes: order.notes || '', Status: status,
    };
    // Only orders that are already confirmed go to the kitchen. A big order
    // that is still waiting for approval reaches it once the daily routine
    // checks the orders table again (part 4's second, scheduled way in).
    if (status === 'Confirmed') {
        context.bindings.kitchenTask = { orderId, item: order.item, orderType: type, people };
    }
    reply(200, { orderId, status, item: order.item, people, pickupDate: order.pickupDate });
};

// The next pickup dates: cakes need 5 days' notice, catering 3 working days.
// Pickups are Monday to Saturday.
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
