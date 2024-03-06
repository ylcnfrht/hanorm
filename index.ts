import { Pool, PoolOptions, ResultSetHeader, createPool, escape } from 'mysql2/promise';
import { logQuery, logMethod } from './decorators';


export interface CustomPool extends Pool {
  pool: any;
  threadId: any;
  connect: any;
  ping: any;
}

export interface ConnectionOptions {
  connectionLimit?: number;
  host: string;
  user: string;
  password: string;
  database: string;
  sync?: boolean;
  logging?: boolean;
}

export type SchemaType<T> = Record<keyof T, any>;

export type MySQLType =
  | 'INT' | 'TINYINT' | 'SMALLINT'
  | 'MEDIUMINT' | 'BIGINT' | 'DECIMAL'
  | 'NUMERIC' | 'FLOAT' | 'DOUBLE'
  | 'BIT' | 'DATE' | 'TIME'
  | 'DATETIME' | 'TIMESTAMP' | 'YEAR'
  | 'CHAR' | 'VARCHAR' | 'BINARY'
  | 'VARBINARY' | 'TINYBLOB' | 'BLOB'
  | 'MEDIUMBLOB' | 'LONGBLOB' | 'TINYTEXT'
  | 'TEXT' | 'MEDIUMTEXT' | 'LONGTEXT'
  | 'ENUM' | 'SET' | 'BOOL' | 'BOOLEAN';


export interface FieldDefinition {
  type: MySQLType;
  size?: number;
  unique?: boolean;
  nullable?: boolean;
  primary?: boolean;
  autoIncrement?: boolean;
  defaultValue?: any;
}

export type JoinType = 'INNER' | 'LEFT' | 'RIGHT';


export interface EntityModel<T> {
  create(data: Record<string, any>): Promise<ResultSetHeader>;
  createMany(entities: Record<string, any>[]): Promise<ResultSetHeader[]>;
  update(id: number, data: Record<string, any>): Promise<T | null>;
  updateMany(ids: number[], data: Record<string, any>): Promise<T[] | null>;
  delete(id: number): Promise<void>;
  deleteMany(ids: number[]): Promise<void>;
  findById(id: number, fields?: string): Promise<T | null>;
  find(conditions?: Record<string, any>, fields?: string): Promise<T[]>;
  join: (joinType: JoinType, table1: string, table2: string, joinConditions: string[], selectFields?: string[]) => Promise<T[] | undefined>;
  count(conditions?: Record<string, any>): Promise<number>;
}

export interface IHanORM{
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  startTransaction(): Promise<any>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  index(entityName: string, fields: string | string[], unique: boolean): Promise<void>;
  dropIndex(entityName: string, indexName: string): Promise<void>;
  createTable<T>(entityName: string, fields: Record<keyof T, FieldDefinition>): Promise<void>;
  dropTable(entityName: string): Promise<void>;
  createModel<T>(entityName: string, fields: Record<keyof T, FieldDefinition>): Promise<EntityModel<T>>;
}

export class HanORM implements IHanORM {
  private pool: CustomPool;
  private sync: boolean | undefined = false;
  protected logging: boolean = false

  constructor(private connectionOptions: ConnectionOptions) {
    this.sync = this.connectionOptions?.sync ?? false;
    this.logging = this.connectionOptions?.logging ?? false;

    delete this.connectionOptions.sync;
    delete this.connectionOptions.logging;

    const poolConfig: PoolOptions = {
      connectionLimit: this.connectionOptions.connectionLimit || 10,
      host: this.connectionOptions.host,
      user: this.connectionOptions.user,
      password: this.connectionOptions.password,
      database: this.connectionOptions.database,
    };

    this.pool = createPool(poolConfig);
  }

  async connect() {
    const connection = await this.pool.getConnection();
    console.log('Connected to the database');
    connection.release();
  }

  async disconnect() {
    await this.pool.end();
    console.log('Disconnected from the database');
  }

  private transactionConnection: any = null;

  async startTransaction(): Promise<any> {
    this.transactionConnection = await this.pool.getConnection();
    await this.transactionConnection.beginTransaction();
    return this.transactionConnection;
  }

  async commitTransaction(): Promise<void> {
    if (!this.transactionConnection) return;

    await this.transactionConnection.commit();
    this.transactionConnection.release();
    this.transactionConnection = null;

  }

  async rollbackTransaction(): Promise<void> {
    if (!this.transactionConnection) return;

    await this.transactionConnection.rollback();
    this.transactionConnection.release();
    this.transactionConnection = null;
  }

  @logMethod()
  async index(entityName: string, fields: string | string[], unique: boolean = false): Promise<void> {
    fields = Array.isArray(fields) ? fields : [fields];

    const indexType = unique ? 'UNIQUE INDEX' : 'INDEX';
    const indexName = `idx_${entityName}_${fields.join('_')}`;
    const fieldsString = fields.join(', ');

    const createIndexQuery = `
        CREATE ${indexType} ${indexName}
        ON ${entityName} (${fieldsString})
      `;

    await this.executeQuery(createIndexQuery);
  }

  @logMethod()
  async dropIndex(entityName: string, indexName: string): Promise<void> {
    const dropIndexQuery = `
        DROP INDEX ${indexName}
        ON ${entityName}
      `;

    await this.executeQuery(dropIndexQuery);
  }

  @logMethod()
  async createTable<T>(entityName: string, fields: Record<keyof T, FieldDefinition>) {
    const fieldDefinitions = Object.entries(fields)
      .map(([fieldName, field]: any) => {
        const { type, size, unique, nullable, primary, autoIncrement, defaultValue, check, comment } = field;

        const constraints = [];
        if (unique) constraints.push('UNIQUE');
        if (primary) constraints.push('PRIMARY KEY');
        if (nullable) constraints.push('NULL');
        if (nullable === undefined) constraints.push('NOT NULL');
        if (autoIncrement) constraints.push('AUTO_INCREMENT');
        if (defaultValue !== undefined) constraints.push(`DEFAULT ${defaultValue}`);
        if (check) constraints.push(`CHECK (${check})`);
        if (comment) constraints.push(`COMMENT '${comment}'`);

        return `${fieldName} ${type}${size ? `(${size})` : ''} ${constraints.join(' ')}`;
      })
      .join(', ');

    if (this.sync) await this.dropTable(entityName);

    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS ${entityName} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ${fieldDefinitions}
    )
  `;

    await this.executeQuery(createTableQuery);
  }

  @logMethod()
  async dropTable(entityName: string) {
    return await this.executeQuery(`DROP TABLE IF EXISTS ${entityName}`);
  }

  async createModel<T>(entityName: string, fields: Record<keyof T, FieldDefinition>): Promise<EntityModel<T>> {
    await this.createTable<T>(entityName, fields);

    return {
      create: (data: Record<string, any>) => this.create<ResultSetHeader>(entityName, data),
      createMany: (entities: Record<string, any>[]) => this.createMany<ResultSetHeader>(entityName, entities),
      update: (id: number, data: Record<string, any>) => this.update<T>(entityName, id, data),
      updateMany: (ids: number[], data: Record<string, any>) => this.updateMany<T>(entityName, ids, data),
      delete: (id: number) => this.delete<T>(entityName, id),
      deleteMany: (ids: number[]) => this.deleteMany<T>(entityName, ids),
      findById: (id: number, fields?: string) => this.findById<T>(entityName, id, fields),
      find: (conditions?: Record<string, any>, fields?: string) => this.find<T>(entityName, conditions, fields),
      join: (joinType: JoinType, table1: string, table2: string, joinConditions: string[], selectFields?: string[],
      ) => this.join(joinType, table1, table2, joinConditions, selectFields),
      count: (conditions?: Record<string, any>) => this.count(entityName, conditions),
    };
  }

  @logMethod()
  async join(
    joinType: JoinType = 'INNER',
    table1: string,
    table2: string,
    joinConditions: string[],
    selectFields?: string[],
  ): Promise<any[] | undefined> {
    const joinTypeClause = joinType.toUpperCase();
    const selectFieldsClause = selectFields !== undefined ? selectFields?.join(', ') : '*';
    const joinConditionsClause = joinConditions.join(' AND ');

    const joinQuery = `
      SELECT ${selectFieldsClause}
      FROM ${table1}
      ${joinTypeClause} JOIN ${table2} ON ${joinConditionsClause}
    `;

    return await this.executeQuery(joinQuery);
  }

  @logQuery((instance: HanORM) => instance.logging)
  private async executeQuery(query: string, params: any[] = [], transactionConnection?: any): Promise<any> {
    const connection = transactionConnection || await this.pool.getConnection();

    try {
      const rows = await connection.execute(query, params);

      return rows[0];
    } finally {
      connection.release();
    }
  }

  @logMethod()
  private async create<T>(entityName: string, fields: Record<string, any>, logging = this.logging): Promise<T> {
    const fieldNames = Object.keys(fields);
    const fieldValues = Object.values(fields);

    const insertEntityQuery = `
      INSERT INTO ${entityName} (${fieldNames.join(', ')})
      VALUES (${fieldNames.map(() => '?').join(', ')})
    `;

    return await this.executeQuery(insertEntityQuery, fieldValues);
  }

  @logMethod()
  private async createMany<T>(entityName: string, entities: Record<string, any>[]): Promise<ResultSetHeader[]> {
    let result: ResultSetHeader[] = [];

    const transactionConnection = await this.startTransaction();

    try {
      for (let field of entities) {
        const fieldNames = Object.keys(field);
        const fieldValues = Object.values(field);

        const insertEntityQuery = `
        INSERT INTO ${entityName} (${fieldNames.join(', ')})
        VALUES (${fieldNames.map(() => '?').join(', ')})
      `;

        result.push(await this.executeQuery(insertEntityQuery, fieldValues, transactionConnection));
      }

      await this.commitTransaction();
    } catch (error) {
      await this.rollbackTransaction();
      throw error;
    }

    return result;
  }


  @logMethod()
  private async update<T>(entityName: string, id: number, fields: Record<string, any>): Promise<T | null> {
    const updateEntityQuery = `
      UPDATE ${entityName}
      SET ${Object.keys(fields).map((fieldName) => `${fieldName} = ?`).join(', ')}
      WHERE id = ?
    `;

    return await this.executeQuery(updateEntityQuery, [...Object.values(fields), id]);
  }

  @logMethod()
  private async updateMany<T>(entityName: string, ids: number[], fields: Record<string, any>): Promise<T[] | null> {
    const result: T[] = [];

    const transactionConnection = await this.startTransaction();

    try {
      for (let id of ids) {
        const updateEntityQuery = `
      UPDATE ${entityName}
      SET ${Object.keys(fields).map((fieldName) => `${fieldName} = ?`).join(', ')}
      WHERE id = ?
    `;
        result.push(await this.executeQuery(updateEntityQuery, [...Object.values(fields), id], transactionConnection));
      }

      await this.commitTransaction();
      return result;
    } catch (error) {
      await this.rollbackTransaction();

      throw error;
    }
  }

  @logMethod()
  private async delete<T>(entityName: string, id: number): Promise<void> {
    const deleteEntityQuery = `DELETE FROM ${entityName} WHERE id = ?`;
    await this.executeQuery(deleteEntityQuery, [id]);
  }

  @logMethod()
  private async deleteMany<T>(entityName: string, ids: number[]): Promise<void> {
    const transactionConnection = await this.startTransaction();

    try {
      for (const id of ids) {
        const deleteEntityQuery = `DELETE FROM ${entityName} WHERE id = ?`;
        await this.executeQuery(deleteEntityQuery, [id], transactionConnection);

        await this.commitTransaction();
      }
    } catch (error) {
      await this.rollbackTransaction();

      throw error;
    }
  }

  @logMethod()
  private async findById<T>(entityName: string, id: number, fields?: string): Promise<T | null> {
    const selectEntityQuery = `SELECT ${fields?.length ? fields : '*'} FROM ${entityName} WHERE id = ?`;
    const result = await this.executeQuery(selectEntityQuery, [id]);

    return result.length > 0 ? result[0] : null;
  }

  @logMethod()
  async find<T>(
    entityName: string,
    conditions?: Record<string, any>,
    fields?: string,
    page?: number,
    pageSize?: number,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<T[]> {
    const conditionString = conditions
      ? `WHERE ${Object.entries(conditions)
        .map(([key, value]) => `${key} = ${escape(value)}`)
        .join(' AND ')}`
      : '';

    const orderByClause = sortBy && sortOrder ? `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}` : '';

    const limitClause = pageSize && page ? `LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}` : '';

    const selectEntitiesQuery = `
        SELECT ${fields?.length ? fields : '*'}
        FROM ${entityName}
        ${conditionString}
        ${orderByClause}
        ${limitClause}
      `;

    return await this.executeQuery(selectEntitiesQuery);
  }

  @logMethod()
  async count(entityName: string, conditions?: Record<string, any>): Promise<number> {
    const conditionString = conditions
      ? `WHERE ${Object.entries(conditions)
        .map(([key, value]) => `${key} = ${escape(value)}`)
        .join(' AND ')}`
      : '';

    const countQuery = `SELECT COUNT(*) AS count FROM ${entityName} ${conditionString}`;
    const result = await this.executeQuery(countQuery);

    return result.length > 0 ? result[0].count : 0;
  }
}
