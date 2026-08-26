import {
    createRouter,
    createWebHistory
} from "vue-router";

import { getToken } from "../api/httpClient";

const router = createRouter({
    history: createWebHistory(),

    routes: [
        {
            path: "/login",
            name: "login",
            component: () => import("../pages/LoginPage.vue"),
            meta: {
                public: true
            }
        },
        {
            path: "/",
            component: () => import("../layouts/MainLayout.vue"),
            children: [
                {
                    path: "",
                    redirect: "/statistics"
                },
                {
                    path: "routes",
                    name: "routes",
                    component: () => import("../pages/RoutesPage.vue")
                },
                {
                    path: "statistics",
                    name: "statistics",
                    component: () => import("../pages/StatisticsPage.vue")
                },
                {
                    path: "import",
                    name: "import",
                    component: () => import("../pages/ImportPage.vue")
                },
                {
                    path: "map/editor",
                    name: "map-editor",
                    component: () => import("../pages/MapEditorPage.vue")
                },
                {
                    path: "map/view",
                    name: "map-view",
                    component: () => import("../pages/MapViewerPage.vue")
                }
            ]
        },
        {
            path: "/:pathMatch(.*)*",
            name: "error",
            component: () => import("../pages/ErrorPage.vue"),
            meta: {
                public: true
            }
        }
    ]
});

router.beforeEach((to) => {
    const token = getToken();

    if (!to.meta.public && !token) {
        return {
            name: "login",
            query: {
                returnUrl: to.fullPath
            }
        };
    }

    if (to.name === "login" && token) {
        return {
            name: "routes"
        };
    }

    return true;
});

export default router;