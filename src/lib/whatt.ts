export interface WhattProductData {
    name: string;
    product_number: string;
    main_image: string;
}

export const fetchWhattProduct = async (url: string): Promise<WhattProductData | null> => {
    try {
        // Create an anchor element to easily parse the URL
        // or just rely on text manipulation if we trust the input is always whatt.io
        let path = '';
        try {
            const urlObj = new URL(url);
            // Ensure we are only proxying whatt.io requests
            if (!urlObj.hostname.includes('whatt.io')) {
                console.warn('Skipping fetch for non-whatt.io URL');
                return null;
            }
            path = urlObj.pathname;
        } catch (e) {
            // If it's not a full URL, maybe it's just a path?
            // But the input is placeholder "https://..."
            return null;
        }

        // Clean path and ensure format=json
        const proxyUrl = `/api/whatt${path}${path.includes('?') ? '&' : '?'}format=json`;

        console.log('Fetching whatt product via proxy:', proxyUrl);
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            console.warn('Failed to fetch whatt.io data:', response.status);
            return null;
        }

        const json = await response.json();

        // Validate expected structure
        if (json?.data) {
            return {
                name: json.data.name || 'Unknown Product',
                product_number: json.data.product_number || 'Unknown ID',
                main_image: json.data.main_image || ''
            };
        }

        return null;
    } catch (error) {
        console.error('Error fetching whatt.io product:', error);
        return null;
    }
};
