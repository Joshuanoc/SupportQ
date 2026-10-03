export const isSapCategory=category=>Boolean(category?.toLowerCase().startsWith('sap'));
export const requiresDeviceContext=scenario=>!isSapCategory(scenario?.category);
