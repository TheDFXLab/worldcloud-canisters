export const sleep = async (time_s: number) => {
    await new Promise(resolve => setTimeout(resolve, time_s * 1000));
}