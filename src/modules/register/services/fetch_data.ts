import axios, { AxiosRequestConfig } from "axios";

type FetchOptions = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  body?: Record<string, any>;
  headers?: Record<string, string>;
};


export const fetchData = async ({ method, url, body, headers }: FetchOptions) => {
  try {
    const config: AxiosRequestConfig = {
      method,
      url,
      data: body,
      headers,
    };
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('Error in fetchData:', error);
    throw new Error('Failed to fetch data');
  }
};
