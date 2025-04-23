import { BadRequestException, Injectable } from '@nestjs/common';
import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { CursorPaginationDto } from '../dto/cursor-pagination.dto';

interface CursorObject {
  values: Record<string, number | string>;
  order: string[];
}

@Injectable()
export class CursorPaginationUtil {
  constructor() {}

  async applyCursorPaginationParamsToQb<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    dto: CursorPaginationDto,
  ) {
    const { cursor, order: initialOrder, take } = dto;
    let order = initialOrder;

    if (cursor) {
      try {
        const decodedCursor = Buffer.from(cursor, 'base64').toString('utf-8');
        const cursorObj = JSON.parse(decodedCursor) as CursorObject;
        order = cursorObj.order;
        const { values } = cursorObj;

        const columns = Object.keys(values);
        const conditions: string[] = [];
        const params: Record<string, number | string> = {};

        for (let i = 0; i < columns.length; i++) {
          const column = columns[i];
          const orderType = order[i].endsWith('DESC') ? '<' : '>';

          const currentConditions = columns
            .slice(0, i)
            .map((c) => `${qb.alias}.${c} = :${c}`)
            .join(' AND ');

          const condition = currentConditions
            ? `(${currentConditions} AND ${qb.alias}.${column} ${orderType} :${column})`
            : `${qb.alias}.${column} ${orderType} :${column}`;

          conditions.push(condition);
          params[column] = values[column];
        }

        const whereClause = conditions.join(' OR ');
        qb.where(whereClause, params);
      } catch (error) {
        // cursor가 유효하지 않은 경우 무시하고 계속 진행
        console.warn('Invalid cursor format:', error);
      }
    }

    for (let i = 0; i < order.length; i++) {
      const [column, direction] = order[i].split('_');
      if (direction !== 'ASC' && direction !== 'DESC') {
        throw new BadRequestException('Order direction must be ASC or DESC');
      }

      if (i === 0) {
        qb.orderBy(`${qb.alias}.${column}`, direction);
      } else {
        qb.addOrderBy(`${qb.alias}.${column}`, direction);
      }
    }

    qb.take(take);

    const results = await qb.getMany();

    const nextCursor = this.generateNextCursor(results, order);

    return { qb, nextCursor };
  }

  generateNextCursor<T extends Record<string, number | string>>(
    results: T[],
    order: string[],
  ): string | null {
    if (results.length === 0) {
      return null;
    }

    const lastItem = results[results.length - 1];
    const values: Record<string, number | string> = {};

    order.forEach((columnOrder) => {
      const [column] = columnOrder.split('_');
      values[column] = lastItem[column];
    });

    const cursorObj: CursorObject = {
      values,
      order,
    };

    return Buffer.from(JSON.stringify(cursorObj)).toString('base64');
  }
}
