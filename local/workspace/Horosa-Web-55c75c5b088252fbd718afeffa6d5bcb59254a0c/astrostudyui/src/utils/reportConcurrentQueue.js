// 报告功能 - 简洁并发队列（默认并发 2，支持 AbortController）。
// 用法：
//   const q = new ConcurrentQueue(2, abortController.signal);
//   q.add(async ()=>{ ... });
//   await q.drain();

export class ConcurrentQueue {
	constructor(concurrency = 2, signal = null){
		this.concurrency = Math.max(1, concurrency|0);
		this.signal = signal;
		this.queue = [];
		this.running = 0;
		this.drainResolvers = [];
		this.errors = []; // 暴露给调用方,audit 修:drain 后调 getErrors() 可知是否有任务失败
		this.successCount = 0;
		this.failureCount = 0;
		this.totalAdded = 0;
	}

	getErrors(){ return this.errors.slice(); }
	getStats(){ return { added: this.totalAdded, success: this.successCount, failure: this.failureCount }; }

	add(taskFn){
		this.totalAdded++;
		const wrapper = new Promise((resolve)=>{
			this.queue.push({taskFn, resolve});
		});
		this._tick();
		return wrapper;
	}

	_tick(){
		while(this.running < this.concurrency && this.queue.length > 0){
			const {taskFn, resolve} = this.queue.shift();
			this.running++;
			Promise.resolve().then(async ()=>{
				if(this.signal && this.signal.aborted){
					resolve({status:'cancelled'});
					return;
				}
				try{
					const value = await taskFn();
					this.successCount++;
					resolve({status:'fulfilled', value});
				}catch(err){
					this.errors.push(err);
					this.failureCount++;
					resolve({status:'rejected', reason: err});
				}
			}).finally(()=>{
				this.running--;
				if(this.running === 0 && this.queue.length === 0){
					const resolvers = this.drainResolvers.splice(0);
					resolvers.forEach((r)=>r());
				}else{
					this._tick();
				}
			});
		}
	}

	drain(){
		if(this.running === 0 && this.queue.length === 0){
			return Promise.resolve();
		}
		return new Promise((resolve)=>{
			this.drainResolvers.push(resolve);
		});
	}
}

export default ConcurrentQueue;
