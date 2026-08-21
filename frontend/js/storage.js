/**
 * Wrapper cho localStorage để dễ dàng chuyển đổi sang API thực tế sau này
 */
const Storage = {
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
