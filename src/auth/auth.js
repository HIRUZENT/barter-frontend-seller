export const getToken = () => {
    return localStorage.getItem("token");
};

export const getCurrentUser = () => {
    const user = localStorage.getItem("current_user");

    return user ? JSON.parse(user) : null;
};

export const isAuthenticated = () => {
    return !!getToken();
};

export const isSeller = () => {
    const user = getCurrentUser();

    return (
        user?.is_seller === true ||
        user?.role === "seller" ||
        user?.roles?.includes("seller") ||
        user?.seller_profile
    );
};

export const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("current_user");

    window.location.href = "/login";
};
export const saveAuthData = (token, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("auth_token", token);
    localStorage.setItem("current_user", JSON.stringify(user));

    if (user?.seller_profile) {
        localStorage.setItem("seller_profile", JSON.stringify(user.seller_profile));
    }
};

export const refreshAuthToken = async () => {
    const refreshToken = localStorage.getItem("refresh_token");

    if (!refreshToken) {
        return false;
    }

    try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/refresh-token", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                refresh_token: refreshToken,
            }),
        });

        const data = await res.json();

        if (!res.ok || !data?.success) {
            return false;
        }

        const token = data.data?.token;

        if (!token) {
            return false;
        }

        localStorage.setItem("token", token);
        localStorage.setItem("auth_token", token);

        return true;
    } catch {
        return false;
    }
};