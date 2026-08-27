import {
    createRouter,
    createWebHistory
} from "vue-router";

import {
    getToken,
    removeToken
} from "../api/httpClient";

import {
    hasTokenRole,
    isTokenExpired
} from "../stores/auth";

const router = createRouter({
    history: createWebHistory(),

    routes: [
        {
            path: "/login",
            name: "login",
            component: () => {
                return import(
                    "../pages/LoginPage.vue"
                    );
            },
            meta: {
                public: true
            }
        },
        {
            path: "/",
            component: () => {
                return import(
                    "../layouts/MainLayout.vue"
                    );
            },
            children: [
                {
                    path: "",
                    redirect: "/routes"
                },
                {
                    path: "routes",
                    name: "routes",
                    component: () => {
                        return import(
                            "../pages/RoutesPage.vue"
                            );
                    }
                },
                {
                    path: "statistics",
                    name: "statistics",
                    component: () => {
                        return import(
                            "../pages/StatisticsPage.vue"
                            );
                    }
                },
                {
                    path: "import",
                    name: "import",
                    component: () => {
                        return import(
                            "../pages/ImportPage.vue"
                            );
                    }
                },
                {
                    path: "map/editor",
                    name: "map-editor",
                    component: () => {
                        return import(
                            "../pages/MapEditorPage.vue"
                            );
                    }
                },
                {
                    path: "map/view",
                    name: "map-view",
                    component: () => {
                        return import(
                            "../pages/MapViewerPage.vue"
                            );
                    }
                },

                /*
                 * Административный раздел.
                 */
                {
                    path: "admin",
                    name: "admin",
                    component: () => {
                        return import(
                            "../pages/admin/AdminPage.vue"
                            );
                    },
                    meta: {
                        requiresRole: "Admin"
                    }
                },
                {
                    path: "admin/routes",
                    name: "admin-routes",
                    component: () => {
                        return import(
                            "../pages/admin/AdminRoutesPage.vue"
                            );
                    },
                    meta: {
                        requiresRole: "Admin"
                    }
                },
                {
                    path: "admin/trains",
                    name: "admin-trains",
                    component: () => {
                        return import(
                            "../pages/admin/AdminTrainsPage.vue"
                            );
                    },
                    meta: {
                        requiresRole: "Admin"
                    }
                },
                {
                    path: "admin/stations",
                    name: "admin-stations",
                    component: () => {
                        return import(
                            "../pages/admin/AdminStationsPage.vue"
                            );
                    },
                    meta: {
                        requiresRole: "Admin"
                    }
                },
                {
                    path: "admin/transactions",
                    name: "admin-transactions",
                    component: () => {
                        return import(
                            "../pages/admin/AdminTransactionsPage.vue"
                            );
                    },
                    meta: {
                        requiresRole: "Admin"
                    }
                }
            ]
        },
        {
            path: "/:pathMatch(.*)*",
            name: "error",
            component: () => {
                return import(
                    "../pages/ErrorPage.vue"
                    );
            },
            meta: {
                public: true
            }
        }
    ]
});

router.beforeEach((to) => {
    const token = getToken();

    const isPublicRoute =
        to.matched.some((route) => {
            return route.meta.public === true;
        });

    if (
        token &&
        isTokenExpired(token)
    ) {
        removeToken();

        if (!isPublicRoute) {
            return {
                name: "login",
                query: {
                    returnUrl: to.fullPath
                }
            };
        }
    }

    if (
        !isPublicRoute &&
        !token
    ) {
        return {
            name: "login",
            query: {
                returnUrl: to.fullPath
            }
        };
    }

    const routeWithRequiredRole =
        to.matched.find((route) => {
            return Boolean(
                route.meta.requiresRole
            );
        });

    if (
        routeWithRequiredRole &&
        !hasTokenRole(
            token,
            routeWithRequiredRole
                .meta.requiresRole
        )
    ) {
        return {
            name: "routes",
            query: {
                accessDenied: "admin"
            }
        };
    }

    if (
        to.name === "login" &&
        token &&
        !isTokenExpired(token)
    ) {
        return {
            name: "routes"
        };
    }

    return true;
});

export default router;