export type ErrorTypeItem = {
    name: string;
    value: number;
    percentage: number;
    color: string;
}

export type ErrorTrendItem = {
    date: string;
    value: number;
    client: number;
    server: number;
}

export type ErrorVsLogTrendItem = {
    date: string;
    errors: number;
    logs: number;
}