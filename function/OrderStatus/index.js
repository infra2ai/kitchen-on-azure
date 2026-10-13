// Looks up an order in the "orders" table by its number, for example BP-1045.
module.exports = async function (context, req) {
    const id = (req.query.orderId || '').trim().toUpperCase();
    const order = context.bindings.orders.find((o) => o.RowKey === id);
    context.res = {
        headers: { 'Content-Type': 'application/json' },
        body: order
            ? { orderId: id, found: true, customer: order.Customer, item: order.Item, people: order.People, pickupDate: order.PickupDate, status: order.Status }
            : { orderId: id, found: false, message: 'There is no order with this number.' },
    };
};
