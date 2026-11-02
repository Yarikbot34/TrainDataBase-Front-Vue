import {
    apiFetch,
    readJson
} from "./httpClient";

const TRAINS_URL = "/api/v1/TableView/trains";

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

export async function getTrains() {
    const response = await apiFetch(TRAINS_URL, {
        cache: "no-store"
    });
    const payload = unwrapResult(await readJson(response));

    if (Array.isArray(payload)) {
        return payload;
    }

    return Array.isArray(payload?.trains)
        ? payload.trains
        : [];
}
