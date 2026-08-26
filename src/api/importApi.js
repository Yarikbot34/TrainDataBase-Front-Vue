import {
    apiFetch,
    readJson
} from "./httpClient";

const FILE_INPUT_URL =
    "/api/v1/file/input";

const ADD_DESCRIPTION_URL =
    "/api/v1/file/input/addDesc";

export async function uploadImportFile({
                                           file,
                                           year,
                                           month
                                       }) {
    const params = new URLSearchParams({
        year: String(year).padStart(2, "0"),
        month: String(month)
    });

    const formData = new FormData();

    formData.append(
        "file",
        file,
        file.name
    );

    const response = await apiFetch(
        `${FILE_INPUT_URL}?${params.toString()}`,
        {
            method: "POST",
            body: formData
        }
    );

    return await readResponseBody(response);
}

export async function updateRecordDescription(
    recordId,
    record,
    description
) {
    const requestBody = {
        ...record,

        Number:
            record.Number ??
            record.number ??
            record.trainNumber,

        StationFrom:
            record.StationFrom ??
            record.stationFrom,

        StationMiddle:
            record.StationMiddle ??
            record.stationMiddle,

        StationTo:
            record.StationTo ??
            record.stationTo,

        Description: description
    };

    const response = await apiFetch(
        `${ADD_DESCRIPTION_URL}/${encodeURIComponent(recordId)}`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        }
    );

    return await readResponseBody(response);
}

async function readResponseBody(response) {
    const contentType =
        response.headers.get("content-type") ?? "";

    const body = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        const message =
            typeof body === "string"
                ? body
                : body?.message ??
                body?.detail ??
                `Сервер вернул ошибку ${response.status}`;

        throw new Error(message);
    }

    return body;
}