export interface WhattProductData {
    name: string;
    product_number: string;
    main_image: string;
    team?: string;
    team_id?: number;
    category?: string;
    category_id?: number;
}

export interface WhattTeam {
    id: number;
    name: string;
    slug: string;
    intro_logo: string | null;
}

export interface WhattUser {
    id: number;
    name: string;
    email: string;
    current_team_id: number;
    profile_photo: string;
}

export const loginToWhattIo = async (email: string, pass: string) => {
    try {
        const queryParams = new URLSearchParams({ email, password: pass });
        const response = await fetch(`/api/whatt/api/v2/login?${queryParams.toString()}`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'X-CSRF-TOKEN': ''
            }
        });
        
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        console.error("Login failed", e);
        return null;
    }
};

export const fetchWhattProfile = async (token: string) => {
    try {
        const response = await fetch(`/api/whatt/api/v2/user`, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        console.error("Failed fetching profile", e);
        return null;
    }
};

export const switchWhattTeam = async (token: string, teamId: number) => {
    try {
        const response = await fetch(`/api/whatt/api/set_team?team_id=${teamId}`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errText = await response.text();
            console.error('Team switch failed:', response.status, errText);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error switching team:', error);
        return false;
    }
};

export const fetchWhattProduct = async (url: string, token?: string): Promise<WhattProductData | null> => {
    try {
        let path = '';
        let productId = null;
        try {
            const urlObj = new URL(url);
            if (!urlObj.hostname.includes('whatt.io')) {
                return null;
            }
            path = urlObj.pathname;
            
            // Extract numeric ID
            const match = url.match(/whatt\.io\/.*?(\d+)(?:[/:]|$)/);
            if (match) {
                productId = match[1];
            }
        } catch (e) {
            return null;
        }

        let response;
        if (productId && token) {
            console.log(`Fetching whatt product via API: /api/v2/product/${productId}/show`);
            response = await fetch(`/api/whatt/api/v2/product/${productId}/show`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'accept': 'application/json'
                }
            });
        } else {
            const proxyUrl = `/api/whatt${path}${path.includes('?') ? '&' : '?'}format=json`;
            console.log('Fetching whatt product via proxy:', proxyUrl);
            response = await fetch(proxyUrl);
        }

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
                main_image: json.data.main_image || '',
                team: json.data.team?.name || 'whatt.io',
                team_id: json.data.team_id || json.data.team?.id,
                category: typeof json.data.category_id !== 'undefined' ? `Category ${json.data.category_id}` : 'Product',
                category_id: json.data.category_id
            };
        }

        return null;
    } catch (error) {
        console.error('Error fetching whatt.io product:', error);
        return null;
    }
};

export const fetchWhattCategories = async (token: string) => {
    try {
        const response = await fetch(`/api/whatt/api/v2/category?page=1&per_page=100`, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) return null;
        const json = await response.json();
        return json?.data?.categories || [];
    } catch (e) {
        return null;
    }
};

export const createWhattUnit = async (token: string, serial: string, productId: number, categoryId?: number, isPublic: boolean = true) => {
    const params = new URLSearchParams();
    params.append('serial', serial);
    params.append('product_id', productId.toString());
    params.append('parts', 'null');
    if (categoryId) params.append('category_id', categoryId.toString());
    params.append('public', isPublic ? 'true' : 'false');

    const response = await fetch(`/api/whatt/api/unit?${params.toString()}`, {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errText = await response.text();
        let errMsg = `HTTP ${response.status}: ${errText}`;
        try {
            const errJson = JSON.parse(errText);
            errMsg = errJson.message || JSON.stringify(errJson.errors) || errText;
        } catch {}
        console.error('Unit creation failed:', errMsg);
        throw new Error(errMsg);
    }

    const json = await response.json();
    return json?.data || json; 
};

export const dispatchEpcisEvent = async (token: string, teamId: number, epcisPayload: any) => {
    const endpoints = [
        `https://analytics.whattio.com/api/webhooks/default/epcis`,
        `https://playground.whattio.com/api/webhooks/${teamId}/epcis`
    ];

    const results = await Promise.allSettled(
        endpoints.map(endpoint => 
            fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(epcisPayload)
            })
        )
    );

    const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
    return { success: failures.length === 0, failures };
};

export const verifyBlockchainAnchor = async (nfcUid: string): Promise<boolean> => {
    try {
        const rpcUrl = 'https://rpc-amoy.polygon.technology';
        const contractAddress = '0x34B47934e060a9b6D638cF17F3b0A4D3fbc72BA8';
        const selector = '0x92efc453';
        const offset = '0000000000000000000000000000000000000000000000000000000000000020';

        const checkUidVariant = async (uidVariant: string): Promise<boolean> => {
            let hexString = '';
            for (let i = 0; i < uidVariant.length; i++) {
                hexString += uidVariant.charCodeAt(i).toString(16);
            }
            
            const lengthHex = uidVariant.length.toString(16).padStart(64, '0');
            const paddedHexString = hexString.padEnd(64, '0');
            const data = selector + offset + lengthHex + paddedHexString;

            const response = await fetch(rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "eth_call",
                    params: [{ to: contractAddress, data }, "latest"],
                    id: 1
                })
            });

            const json = await response.json();
            
            if (json.error || !json.result || json.result === '0x') {
                return false;
            }
            
            const isAnchoredWord = json.result.slice(258, 322);
            return isAnchoredWord.endsWith('1');
        };

        // Arduino Natively reads UPPERCASE, Webhook parsing sometimes casts LOWERCASE. Test both strings!
        if (await checkUidVariant(nfcUid.toLowerCase())) return true;
        if (await checkUidVariant(nfcUid.toUpperCase())) return true;
        
        return false;
        
    } catch (err) {
        console.error('Blockchain RPC Verification Failed:', err);
        return false;
    }
};
