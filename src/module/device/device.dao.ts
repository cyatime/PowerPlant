import { DeviceLineStatus, DeviceLock } from '@/constant/device.constant';
import { Pagination, QueryPagination } from '@/interface/page-info.interface';
import { PrismaService } from '@/processor/database/prisma.service';
import { Logger, LoggerService } from '@/processor/log4j/log4j.service';
import {
  encryptedWithPbkdf2,
  excludePagination,
  generateQueryParam,
  likeQuery,
} from '@/util';
import { Injectable } from '@nestjs/common';
import { Device } from '@prisma/client';
import { DeviceDTO, DeviceParams } from './device.dto';

@Injectable()
export class DeviceDao implements QueryPagination<DeviceParams, Device> {
  private logger: Logger;
  constructor(
    private readonly prismaService: PrismaService,
    private log4js: LoggerService,
  ) {
    this.logger = this.log4js.getLogger(DeviceDao.name);
  }

  async findDeviceById(deviceId: string) {
    this.logger.info('findDeviceById.deviceId >>', deviceId);
    const client = await this.prismaService.device.findFirst({
      where: {
        deviceId,
      },
      include: {
        grants: {
          include: {
            grant: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    this.logger.debug('[findDeviceById] client >>>', client);
    return client;
  }

  upsertDevice(deviceId: string, userId: string) {
    this.logger.info(
      '[delUserOnDevice] deviceId >>',
      deviceId,
      'userId>>>',
      userId,
    );
    return this.prismaService.userOnDevice.upsert({
      create: {
        userId,
        deviceId,
      },
      update: {
        updatedAt: new Date().toISOString(),
      },
      where: {
        userId_deviceId: {
          userId,
          deviceId,
        },
      },
    });
  }

  insertUserOnDevice(deviceId: string, userId: string) {
    this.logger.info(
      '[insertUserOnDevice] deviceId >>',
      deviceId,
      'userId>>>',
      userId,
    );
    return this.prismaService.userOnDevice.create({
      data: {
        userId,
        deviceId,
      },
    });
  }

  async saveDevice(device: DeviceDTO) {
    this.logger.info('[saveDevice] device = %s', device);
    const deviceSecret = await encryptedWithPbkdf2(device.deviceId);
    const clientResult = await this.prismaService.device.create({
      data: {
        name: device.name,
        deviceId: device.deviceId,
        os: device.os,
        type: device.type,
        engine: device.engine,
        isOnline: DeviceLineStatus.ONLINE,
        isLocked: DeviceLock.UN_LOCKED,
        deviceSecret,
      },
      select: {
        id: true,
        deviceSecret: true,
      },
    });
    return clientResult;
  }

  async saveGrant(...grants: string[]) {
    await this.prismaService.grant.createMany({
      data: grants.map((item) => {
        return {
          name: item,
        };
      }),
      skipDuplicates: true,
    });
    this.logger.info('[saveGrant] save grant successfully!!');
  }

  async findGrantsByName(...names: string[]) {
    const grants = await this.prismaService.grant.findMany({
      where: {
        name: {
          in: names,
        },
      },
      select: {
        id: true,
      },
    });
    this.logger.debug('[findGrantsByName]::: grant :::', grants);
    return grants;
  }

  async saveGrantOnDevice(deviceId: string, ...grantIds: { id: string }[]) {
    await this.prismaService.grantOnDevice.createMany({
      data: grantIds.map((grantId) => {
        return {
          grantId: grantId.id,
          deviceId,
        };
      }),
      skipDuplicates: true,
    });
    this.logger.info('[saveGrantOnDevice] save grant on device successfully!!');
  }

  async updateDevice(device: DeviceDTO) {
    const result = this.prismaService.device.update({
      data: {
        isOnline: device.isOnline,
        os: device.os,
        engine: device.engine,
        isLocked: device.isLocked,
        accessTokenValidateSeconds: device.accessTokenValidateSeconds,
        refreshTokenValidateSeconds: device.refreshTokenValidateSeconds,
      },
      where: {
        id: device.id,
      },
      select: {
        id: true,
      },
    });
    this.logger.info('[updateDevice] updateDevice device successfully!!');
    return result;
  }

  async getDeviceById(id: string) {
    this.logger.info('[getDeviceById] id = %s', id);
    const deviceInfo = await this.prismaService.device.findUnique({
      where: {
        id,
      },
      include: {
        grants: {
          select: {
            grant: true,
          },
        },
      },
    });
    this.logger.info('[getDeviceById] getDeviceById successfully!!');
    return deviceInfo;
  }

  async pageList(query: DeviceParams): Promise<Pagination<Partial<Device>[]>> {
    const where = {
      ...excludePagination(query),
      ...likeQuery<Device>(query, 'name'),
    };
    const queryPage = generateQueryParam(query);
    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.device.findMany({
        ...queryPage,
        where,
        select: {
          accessTokenValidateSeconds: true,
          createdAt: true,
          deviceId: true,
          engine: true,
          id: true,
          isLocked: true,
          isOnline: true,
          name: true,
          os: true,
          refreshTokenValidateSeconds: true,
          type: true,
          updatedAt: true,
        },
      }),
      this.prismaService.device.count({
        ...queryPage,
        where,
      }),
    ]);
    return {
      total,
      data,
      pageSize: query.pageSize,
      pageNumber: query.current,
    };
  }

  async batchDeleteDevice(deviceIdObj: { ids: string[] }) {
    const userOnDevice = this.prismaService.userOnDevice.deleteMany({
      where: {
        deviceId: {
          in: deviceIdObj.ids,
        },
      },
    });
    const delDeviceOnGrant = this.prismaService.grantOnDevice.deleteMany({
      where: {
        deviceId: {
          in: deviceIdObj.ids,
        },
      },
    });

    const delDevice = this.prismaService.device.deleteMany({
      where: {
        id: {
          in: deviceIdObj.ids,
        },
      },
    });

    await this.prismaService.$transaction([
      userOnDevice,
      delDeviceOnGrant,
      delDevice,
    ]);
    this.logger.info('[batchDeleteDevice] batchDeleteDevice successfully!!');
    return {};
  }

  async getDeviceDetail(id: string) {
    this.logger.info('[getDeviceDetail] id = %s', id);
    const deviceInfo = await this.prismaService.device.findUnique({
      select: {
        id: true,
        accessTokenValidateSeconds: true,
        createdAt: true,
        deviceId: true,
        engine: true,
        isLocked: true,
        isOnline: true,
        name: true,
        os: true,
        refreshTokenValidateSeconds: true,
        type: true,
        updatedAt: true,
        grants: {
          select: {
            grant: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      where: {
        id,
      },
    });

    this.logger.info('[getDeviceDetail] get client detail  successfully!!');
    return {
      ...deviceInfo,
      grants: deviceInfo?.grants.map((item) => item.grant.name) || [],
    };
  }
}
