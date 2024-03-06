import { getCurrentDetailedTime } from "../utils";
import { green, blue, yellow } from 'console-log-colors';

export function logQuery(getLoggingValue: (instance: any) => boolean = () => false) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    const originalMethod = descriptor.value;
    const methodName = `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      try {
        const logging = getLoggingValue(this);
        if (logging) {
          console.log(`${green('[' + getCurrentDetailedTime() + ']')} :: Executing SQL query for ${blue(propertyKey)} called with arguments: ${yellow(args)}`);
        }
        return await originalMethod.apply(this, args);
      } catch (error) {
        console.error(`Error in method ${methodName}`, error);
        throw error;
      }
    }
  }
}

export function logMethod() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    const originalMethod = descriptor.value;
    const methodName = `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        console.error(`Error in method ${methodName}`, error);
        throw error;
      }
    }
  }
}
