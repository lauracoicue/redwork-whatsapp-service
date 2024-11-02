const normalizePhoneNumber = (value: string): {country: string, phone:string}  => {
    const phone = value.replace('@c.us', '').substring(2);
    const country = phone.substring(0, 2);
    return {
        country,
        phone,
    }
}


const parsePhoneNumber = (phone: string, country: string ): string => {
    return `${country}${phone}@c.us`;

}

export {
    normalizePhoneNumber,
    parsePhoneNumber
}