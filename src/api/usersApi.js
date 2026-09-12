import { apiFetch, readJson } from "./httpClient";

const BASE_URL = "/api/v1/adminPanel/Users";

export async function getUsers() {
    const response = await apiFetch(BASE_URL);
    return await readJson(response);
}

export async function getUserRoles() {
    const response = await apiFetch(`${BASE_URL}/Roles`);
    return await readJson(response);
}

export async function addUser(user) {
    const response = await apiFetch(`${BASE_URL}/Add`, {
        method: "POST",
        body: JSON.stringify({
            adminPassword: user.adminPassword,
            name: user.username,
            role: user.role,
            password: user.password
        })
    });

    return await readJson(response);
}

export async function editUser(user) {
    const response = await apiFetch(`${BASE_URL}/edit`, {
        method: "PATCH",
        body: JSON.stringify({
            id: user.id,
            username: user.username,
            role: user.role,
            adminPassword: user.adminPassword
        })
    });

    return await readJson(response);
}

export async function deleteUser(id, adminPassword) {
    const response = await apiFetch(
        `${BASE_URL}/${encodeURIComponent(id)}`,
        {
            method: "DELETE",
            body: JSON.stringify(adminPassword)
        }
    );

    return await readJson(response);
}