export type AspireExpression = unknown;

export interface AspireEndpoint {
    property(property: unknown): Promise<unknown>;
}

export interface AspirePostgresResource {
    userNameParameter: AspireExpression;
    passwordParameter: AspireExpression;
    withLifetime(lifetime: unknown): Promise<void>;
    withInitFiles(path: string): Promise<void>;
    addDatabase(name: string): Promise<unknown>;
    getEndpoint(name: string): Promise<AspireEndpoint>;
}

export interface AspireContainerResource {
    withEnvironment(name: string, value: unknown): AspireContainerResource;
    withHttpEndpoint(options: { env: string; targetPort: number; port: number; }): AspireContainerResource;
    withExternalHttpEndpoints(): AspireContainerResource;
    withReference(resource: unknown): AspireContainerResource;
    waitFor(resource: unknown): AspireContainerResource;
}

export interface AspireApplication {
    run(): Promise<void>;
}

export interface AspireBuilder {
    addDockerComposeEnvironment(name: string): Promise<unknown>;
    addParameter(name: string, options: { secret: boolean; }): Promise<unknown>;
    addPostgres(name: string): Promise<AspirePostgresResource>;
    addDockerfile(name: string, path: string): AspireContainerResource;
    build(): AspireApplication;
}

export const ContainerLifetime: {
    Persistent: unknown;
};

export const EndpointProperty: {
    Host: unknown;
    Port: unknown;
};

export function createBuilder(): Promise<AspireBuilder>;
export function refExpr(strings: TemplateStringsArray, ...values: unknown[]): AspireExpression;
