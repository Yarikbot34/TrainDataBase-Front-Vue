import {
    apiFetch,
    readJson
} from "./httpClient";

const STATIONS_URL = "/api/v1/adminPanel/stations";

export async function getStations() {
    const response = await apiFetch(STATIONS_URL, {
        cache: "no-store"
    });

    return await readJson(response);
}

export async function addStation({ name, class: stationClass }) {
    const response = await apiFetch(`${STATIONS_URL}/add`, {
        method: "POST",
        body: JSON.stringify({
            name,
            class: stationClass
        })
    });

    if (response.status === 204) {
        return null;
    }

    return await readJson(response);
}

export async function updateStation(id, { name, class: stationClass }) {
    const response = await apiFetch(
        `${STATIONS_URL}/${encodeURIComponent(id)}`,
        {
            method: "PUT",
            body: JSON.stringify({
                name,
                class: stationClass
            })
        }
    );

    if (response.status === 204) {
        return null;
    }

    return await readJson(response);
}

export async function deleteStation(id) {
    const response = await apiFetch(
        `${STATIONS_URL}/${encodeURIComponent(id)}`,
        {
            method: "DELETE"
        }
    );

    if (response.status === 204) {
        return null;
    }

    return await readJson(response);
}
