import { readJson, setToken } from "./httpClient";

const LOGIN_URL = "/api/v1/authentification/login";

export async function login(name, password) {
    const response = await fetch(LOGIN_URL, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name,
            password
        })
    });

    const body = await readJson(response);

    if (!body?.token) {
        throw new Error("Сервер не вернул JWT-токен.");
    }

    setToken(body.token);

    return body;
}