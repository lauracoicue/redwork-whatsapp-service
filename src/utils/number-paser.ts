export const normalizePhoneNumber = (value: string): {country: string, phone:string}  => {
    const phone = value.replace('@c.us', '').substring(2);
    const country = value.substring(0, 2);
    return {
        country,
        phone,
    }
}


export const parsePhoneNumber = (phone: string, country: string ): string => {
    return `${country}${phone}@c.us`;

}

export const locationParser = (location: string): {latitude: number, longitude: number} => {
    const [latitude, longitude] = location.split(',');
    return {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
    }
}
