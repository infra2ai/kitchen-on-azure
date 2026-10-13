// Records a request to the supplier for more of an ingredient. There is no
// real supplier in this demo, so this is where a purchase order or an email
// would go in production -- see the README.
module.exports = async function (context, req) {
    const { ingredient, quantity } = req.body || {};
    if (!ingredient || !quantity) {
        context.res = { status: 400, headers: { 'Content-Type': 'application/json' }, body: { error: 'Need an ingredient and a quantity.' } };
        return;
    }
    const id = `${ingredient}-${Date.now()}`;
    context.bindings.notification = {
        PartitionKey: 'notifications', RowKey: id, Ingredient: ingredient, Quantity: Number(quantity),
        Status: 'Queued', CreatedAt: new Date().toISOString(),
    };
    context.res = { headers: { 'Content-Type': 'application/json' }, body: { id, ingredient, quantity, status: 'Queued' } };
};
