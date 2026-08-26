import {
    apiFetch,
    readJson
} from "./httpClient";

const YEARS_URL =
    "/api/v1/content/writedYears";

const PASSENGERS_URL =
    "/api/v1/statistics/passengers/byYearInMonth";

const PAYMENT_URL =
    "/api/v1/statistics/payment/byYearInMonth";

export async function getWrittenYears() {
    const response = await apiFetch(YEARS_URL);

    return await readJson(response);
}

export async function getPassengerStatistics(year) {
    const response = await apiFetch(
        `${PASSENGERS_URL}/${encodeURIComponent(year)}`
    );

    return await readJson(response);
}

export async function getPaymentStatistics(year) {
    const response = await apiFetch(
        `${PAYMENT_URL}/${encodeURIComponent(year)}`
    );

    return await readJson(response);
}