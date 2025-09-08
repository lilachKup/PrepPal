export function getStoreSession() {
    try {
        const raw = localStorage.getItem("pp_store") || localStorage.getItem("pp_user");
        if (!raw) return null;

        const obj = JSON.parse(raw);

        const storeId =
            obj.storeId ||
            obj.store_id ||
            obj.sub ||
            obj.profile?.sub;

        const storeName =
            obj.storeName ||
            obj.store_name ||
            obj.name ||
            obj.profile?.name ||
            "Store";

        if (!storeId) return null;
        return { storeId, storeName };
    } catch {
        return null;
    }
}

export function requireStoreSessionOrRedirect() {
    const session = getStoreSession();
    if (!session) {
        window.location.href = "/login";
        return null;
    }
    return session;
}
