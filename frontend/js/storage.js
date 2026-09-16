// Helper for handling localStorage with JSON parsing
const StorageHelper = {
    get: function(key) {
        try {
            const item = localStorage.getItem(key);
            if (!item || item === 'null' || item === 'undefined') return null;
            return JSON.parse(item);
        } catch (e) {
            console.error(`Error reading ${key} from localStorage`, e);
            return null;
        }
    },
    
    set: function(key, value) {
        try {
            if (value === null || value === undefined) {
                localStorage.removeItem(key);
                return true;
            }
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`Error saving ${key} to localStorage`, e);
            return false;
        }
    },
    
    remove: function(key) {
        localStorage.removeItem(key);
    },
    
    clearAll: function() {
        localStorage.clear();
    }
};

// Bind to window.Storage (native constructor) so window.Storage.get() and Storage.get() both work smoothly
if (typeof window !== 'undefined') {
    if (window.Storage) {
        window.Storage.get = StorageHelper.get;
        window.Storage.set = StorageHelper.set;
        window.Storage.remove = StorageHelper.remove;
        window.Storage.clearAll = StorageHelper.clearAll;
    }
    window.AppStorage = StorageHelper;
}

// Global Storage reference for non-window or direct scope access
var Storage = StorageHelper;
