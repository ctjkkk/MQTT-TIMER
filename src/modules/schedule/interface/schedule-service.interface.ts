export interface IScheduleService {
  /**
   * 创建定时任务并同步到设备
   * @param scheduleData 定时任务数据
   */
  createSchedule(scheduleData: any): Promise<void>
}
