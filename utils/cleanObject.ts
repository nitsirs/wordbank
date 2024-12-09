export const cleanObject = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map((item) => cleanObject(item));
    } else if (obj !== null && typeof obj === "object") {
      return Object.keys(obj).reduce((acc, key) => {
        const value = obj[key];
        if (value !== undefined) {
          acc[key] = cleanObject(value);
        }
        return acc;
      }, {} as any);
    }
    return obj;
  };