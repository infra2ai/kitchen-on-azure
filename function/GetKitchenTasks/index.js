// Lists confirmed orders the kitchen still needs to prepare, from today
// onward, read straight from the same "orders" table PlaceOrder writes to
// and staff approve in the Storage browser (part 3).
module.exports = async function (context, req) {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(new Date());
    const tasks = context.bindings.orders
        .filter((o) => o.Status === 'Confirmed' && o.PickupDate >= today)
        .map((o) => ({ orderId: o.RowKey, item: o.Item, orderType: o.Type, people: o.People, pickupDate: o.PickupDate }));
    context.res = { headers: { 'Content-Type': 'application/json' }, body: { today, tasks } };
};
