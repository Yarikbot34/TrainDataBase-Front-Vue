import {
    apiFetch,
    readJson
} from "./httpClient";

const TRAINS_URL = "/api/v1/TableView/trains";
const TRAINS_FILTER_URL = "/api/v1/TableView/trains/filter";

function unwrapResult(payload) {
    if (
        payload &&
        typeof payload === "object" &&
        !Array.isArray(payload) &&
        Object.prototype.hasOwnProperty.call(payload, "result")
    ) {
        return payload.result;
    }

    return payload;
}

async function getTrainsData(url, options = {}) {
    const response = await apiFetch(url, {
        ...options,
        cache: "no-store"
    });
    const payload = unwrapResult(await readJson(response));

    if (Array.isArray(payload)) {
        return {
            trains: payload,
            totals: null
        };
    }

    return {
        trains: Array.isArray(payload?.trains)
            ? payload.trains
            : [],
        totals: payload && typeof payload === "object"
            ? payload
            : null
    };
}

export async function getTrains() {
    return await getTrainsData(TRAINS_URL);
}

export async function getFilteredTrains(filters) {
    return await getTrainsData(TRAINS_FILTER_URL, {
        method: "POST",
        body: JSON.stringify(filters)
    });
}
