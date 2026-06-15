import { history } from 'umi';
import { Modal, } from 'antd';
import * as service from '../services/rules';


export default {
	namespace: 'rules',

	state: {
		ziwei: null,
	},

	reducers: {
		save(state, {payload: values}){
			let st = { ...state, ...values, };
			return st;
		},
	},

	effects: {
		*ziwei({ payload: values }, { call, put }){
            let params = { };

			// 走会话缓存:app 启动时本 effect 即 prime 缓存,之后紫微排盘路径零 RTT 命中。
			const { Result } = yield call(service.ziweirulesCached, params);

			yield put({
                type: 'save',
                payload: {  
					ziwei: Result,
                },
			});
			
		},

	},
}