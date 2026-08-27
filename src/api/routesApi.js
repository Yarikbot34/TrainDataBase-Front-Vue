import {
    apiFetch,
    readJson
} from "./httpClient";

const ROUTES_URL =
    "/api/v1/TableView/routes";

const ROUTES_FILTER_URL =
    "/api/v1/TableView/routes/filter";

const TRAINS_URL =
    "/api/v1/TableView/trains";

const CONTENT_URL =
    "/api/v1/content";

const EMPTY_SUMMARY = Object.freeze({
    fullSum: 0,
    casualSum: 0,
    studentSum: 0,
    fedBenefitSum: 0,
    regBenefitSum: 0,
    another: 0
});

function createEmptySummary() {
    return {
        ...EMPTY_SUMMARY
    };
}

function normalizeSummary(summary) {
    if (
        !summary ||
        typeof summary !== "object" ||
        Array.isArray(summary)
    ) {
        return createEmptySummary();
    }

    return {
        ...EMPTY_SUMMARY,
        ...summary
    };
}

function unwrapResult(payload) {
    if (
        payload &&
        typeof payload === "object" &&
        !Array.isArray(payload) &&
        Object.prototype.hasOwnProperty.call(
            payload,
            "result"
        )
    ) {
        return payload.result;
    }

    return payload;
}

function normalizeRoutesResponse(payload) {
    const result = unwrapResult(payload);

    /*
     * Поддержка старого ответа, в котором API
     * возвращал непосредственно массив маршрутов.
     */
    if (Array.isArray(result)) {
        return {
            routes: result,
            summCount: createEmptySummary(),
            summPayment: createEmptySummary(),
            averWayLength: createEmptySummary(),
            summPaymentBySubj: createEmptySummary()
        };
    }

    if (
        !result ||
        typeof result !== "object"
    ) {
        return {
            routes: [],
            summCount: createEmptySummary(),
            summPayment: createEmptySummary(),
            averWayLength: createEmptySummary(),
            summPaymentBySubj: createEmptySummary()
        };
    }

    return {
        routes: Array.isArray(result.routes)
            ? result.routes
            : [],
        summCount: normalizeSummary(
            result.summCount
        ),
        summPayment: normalizeSummary(
            result.summPayment
        ),
        averWayLength: normalizeSummary(
            result.averWayLength
        ),
        summPaymentBySubj: normalizeSummary(
            result.summPaymentBySubj
        )
    };
}

async function getJson(
    url,
    options = {}
) {
    const response = await apiFetch(url, {
        cache: "no-store",
        ...options
    });

    return await readJson(response);
}

async function getRoutesJson(
    url,
    options = {}
) {
    const payload = await getJson(
        url,
        options
    );

    return normalizeRoutesResponse(payload);
}

export async function getRoutes() {
    return await getRoutesJson(
        ROUTES_URL
    );
}

export async function getFilteredRoutes(
    filters
) {
    return await getRoutesJson(
        ROUTES_FILTER_URL,
        {
            method: "POST",
            body: JSON.stringify(filters)
        }
    );
}

export async function getTrains(
    year,
    month,
    routeNumber
) {
    const url =
        `${TRAINS_URL}/` +
        `${encodeURIComponent(year)}/` +
        `${encodeURIComponent(month)}/` +
        `${encodeURIComponent(routeNumber)}`;

    return await getJson(url);
}

export async function getWrittenNumbers() {
    return await getJson(
        `${CONTENT_URL}/writedNumbers`
    );
}

export async function getWrittenStations() {
    return await getJson(
        `${CONTENT_URL}/writedStations`
    );
}

export async function getWrittenPeriods() {
    return await getJson(
        `${CONTENT_URL}/writedPeriods`
    );
}