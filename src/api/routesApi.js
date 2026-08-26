import { apiFetch, readJson } from "./httpClient";

const ROUTES_URL = "/api/v1/TableView/routes";
const ROUTES_FILTER_URL = "/api/v1/TableView/routes/filter";
const TRAINS_URL = "/api/v1/TableView/trains";

const CONTENT_URL = "/api/v1/content";

export async function getRoutes() {
    const response = await apiFetch(ROUTES_URL);
    return await readJson(response);
}

export async function getFilteredRoutes(filters) {
    const response = await apiFetch(ROUTES_FILTER_URL, {
        method: "POST",
        body: JSON.stringify(filters)
    });

    return await readJson(response);
}

export async function getTrains(year, month, routeNumber) {
    const url =
        `${TRAINS_URL}/` +
        `${encodeURIComponent(year)}/` +
        `${encodeURIComponent(month)}/` +
        `${encodeURIComponent(routeNumber)}`;

    const response = await apiFetch(url);

    return await readJson(response);
}

export async function getWrittenNumbers() {
    const response = await apiFetch(
        `${CONTENT_URL}/writedNumbers`
    );

    return await readJson(response);
}

export async function getWrittenStations() {
    const response = await apiFetch(
        `${CONTENT_URL}/writedStations`
    );

    return await readJson(response);
}

export async function getWrittenPeriods() {
    const response = await apiFetch(
        `${CONTENT_URL}/writedPeriods`
    );

    return await readJson(response);
}