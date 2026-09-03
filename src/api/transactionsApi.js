import {
    apiFetch,
    readJson
} from "./httpClient";

const ADMIN_TRANSACTIONS_URL =
    "/api/v1/adminPanel/transactions";

const CONTENT_URL =
    "/api/v1/content";

export async function getTransactions(filters) {
    const response = await apiFetch(
        ADMIN_TRANSACTIONS_URL,
        {
            method: "POST",
            body: JSON.stringify(filters)
        }
    );

    return await readJson(response);
}

export async function getWrittenTransactionTypes() {
    const response = await apiFetch(
        `${CONTENT_URL}/WritedTransactionTypes`
    );

    return await readJson(response);
}

export async function updateTransaction(transaction) {
    const transactionId = encodeURIComponent(
        transaction.id
    );

    const response = await apiFetch(
        `${ADMIN_TRANSACTIONS_URL}/${transactionId}`,
        {
            method: "PATCH",
            body: JSON.stringify(transaction)
        }
    );

    if (response.status === 204) {
        return null;
    }

    return await readJson(response);
}

export async function deleteTransactionObjects({
                                                   transactionId,
                                                   adminPassword
                                               }) {
    const encodedTransactionId = encodeURIComponent(
        transactionId
    );

    const response = await apiFetch(
        `${ADMIN_TRANSACTIONS_URL}/${encodedTransactionId}`,
        {
            method: "DELETE",
            body: JSON.stringify({
                transactionId,
                adminPassword
            })
        }
    );

    if (response.status === 204) {
        return null;
    }

    return await readJson(response);
}