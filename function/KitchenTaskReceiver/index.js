// Runs the moment a confirmed order reaches the "kitchen-tasks" queue (sent
// by PlaceOrder). Works out which ingredients it used, from a rough recipe,
// and takes them off the stock table -- so stock is up to date before anyone
// asks the Kitchen agent about it.
//
// The table input binding can read every row, but the Node.js table OUTPUT
// binding only supports inserting brand new rows, not updating ones that
// already exist -- an Azure Functions limitation, not a bug in this code.
// So updates go straight to Table Storage's REST API instead, signed with
// the same storage account key every function already has via
// AzureWebJobsStorage. The queue message itself can arrive already parsed
// into an object (Azure Functions detects JSON content), or as plain text,
// so both are accepted.
const crypto = require('crypto');

const RECIPES = {
    cake: { flour: 0.4, sugar: 0.25, eggs: 0.3, butter: 0.2 },
    catering: { bread: 0.5, cheese: 0.2, ham: 0.15 },
};

function authHeader(account, key, tableName, rowKey, dateStr) {
    const resource = `/${account}/${tableName}(PartitionKey='stock',RowKey='${rowKey}')`;
    const stringToSign = `MERGE\n\napplication/json\n${dateStr}\n${resource}`;
    const signature = crypto.createHmac('sha256', Buffer.from(key, 'base64')).update(stringToSign, 'utf8').digest('base64');
    return `SharedKey ${account}:${signature}`;
}

async function updateStockRow(account, key, row) {
    const dateStr = new Date().toUTCString();
    const url = `https://${account}.table.core.windows.net/stock(PartitionKey='stock',RowKey='${row.RowKey}')`;
    const res = await fetch(url, {
        method: 'MERGE',
        headers: {
            Authorization: authHeader(account, key, 'stock', row.RowKey, dateStr),
            Date: dateStr,
            'x-ms-version': '2019-02-02',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error(`stock update failed for ${row.RowKey}: ${res.status} ${await res.text()}`);
}

module.exports = async function (context, message) {
    const task = typeof message === 'string' ? JSON.parse(message) : message;
    const recipe = RECIPES[task.orderType] || {};
    const stock = Object.fromEntries(context.bindings.stockIn.map((row) => [row.RowKey, row]));

    const conn = process.env.AzureWebJobsStorage;
    const account = conn.match(/AccountName=([^;]+)/)[1];
    const key = conn.match(/AccountKey=([^;]+)/)[1];

    const used = [];
    for (const [ingredient, perPerson] of Object.entries(recipe)) {
        const row = stock[ingredient];
        if (!row) continue;
        const quantity = Math.max(0, Number(row.Quantity) - perPerson * task.people);
        await updateStockRow(account, key, {
            RowKey: ingredient, Quantity: quantity, ReorderLevel: row.ReorderLevel, Unit: row.Unit,
        });
        used.push(ingredient);
    }

    context.log(`Order ${task.orderId}: took ${task.people} people's worth of ${task.orderType} off the stock`
        + ` (${used.join(', ') || 'nothing tracked'}).`);
};
