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

async function getJson(url, options = {}) {
    const response = await apiFetch(url, {
        cache: "no-store",
        ...options
    });

    return await readJson(response);
}

export async function getRoutes() {
    return await getJson(ROUTES_URL);
}

export async function getFilteredRoutes(filters) {
    return await getJson(ROUTES_FILTER_URL, {
        method: "POST",
        body: JSON.stringify(filters)
    });
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