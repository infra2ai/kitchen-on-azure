// The kitchen's current stock, one row per ingredient.
module.exports = async function (context, req) {
    const stock = context.bindings.stock.map((s) => ({
        ingredient: s.RowKey, quantity: Number(s.Quantity), unit: s.Unit, reorderLevel: Number(s.ReorderLevel),
    }));
    context.res = { headers: { 'Content-Type': 'application/json' }, body: stock };
};
