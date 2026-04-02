<template>
  <div class="push-demo-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>消息推送功能演示</span>
          <el-button type="primary" plain @click="showPreview">预览效果</el-button>
        </div>
      </template>

      <el-form :model="pushForm" label-width="120px">
        <el-form-item label="推送类型">
          <el-radio-group v-model="pushForm.type">
            <el-radio label="now">立即推送</el-radio>
            <el-radio label="scheduled">定时推送</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="发送时间" v-if="pushForm.type === 'scheduled'">
          <el-date-picker
            v-model="pushForm.scheduledTime"
            type="datetime"
            placeholder="选择日期时间"
          />
        </el-form-item>

        <el-form-item label="目标用户">
          <el-select v-model="pushForm.target" placeholder="请选择目标用户">
            <el-option label="全部用户" value="all" />
            <el-option label="VIP 用户组" value="vip" />
            <el-option label="最近活跃用户" value="active_l7d" />
            <el-option label="指定用户ID" value="specific" />
          </el-select>
        </el-form-item>

        <el-form-item label="用户ID列表" v-if="pushForm.target === 'specific'">
          <el-input
            v-model="pushForm.userIds"
            type="textarea"
            placeholder="请输入用户ID，用逗号分隔"
            :rows="2"
          />
        </el-form-item>

        <el-form-item label="消息标题" required>
          <el-input v-model="pushForm.title" placeholder="请输入消息标题" maxlength="50" show-word-limit />
        </el-form-item>

        <el-form-item label="消息内容" required>
          <el-input
            v-model="pushForm.content"
            type="textarea"
            placeholder="请输入消息内容"
            :rows="4"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="跳转链接">
          <el-input v-model="pushForm.url" placeholder="https://..." >
             <template #prepend>Http://</template>
          </el-input>
        </el-form-item>

        <el-form-item label="目标平台">
          <el-checkbox-group v-model="pushForm.platforms">
            <el-checkbox label="Web Browser" />
            <el-checkbox label="iOS App" />
            <el-checkbox label="Android App" />
          </el-checkbox-group>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="onSubmit" :loading="sending">确认发送</el-button>
          <el-button @click="onSaveDraft">保存草稿</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="box-card history-card">
      <template #header>
        <div class="card-header">
          <span>最近推送记录 (演示数据)</span>
        </div>
      </template>
      <el-table :data="historyData" style="width: 100%">
        <el-table-column prop="date" label="发送时间" width="180" />
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="target" label="目标群体" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === '成功' ? 'success' : (scope.row.status === '发送中' ? 'warning' : 'danger')">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default>
            <el-button link type="primary" size="small">复用</el-button>
            <el-button link type="danger" size="small">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="previewVisible" title="消息预览" width="30%">
      <div class="notification-preview">
        <div class="preview-header">
          <img src="https://via.placeholder.com/20" alt="icon" class="app-icon">
          <span>你的应用名称</span>
          <span class="time">刚刚</span>
        </div>
        <div class="preview-content">
          <div class="preview-title">{{ pushForm.title || '消息标题未设置' }}</div>
          <div class="preview-body">{{ pushForm.content || '消息内容未设置...' }}</div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="previewVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'

// 表单数据
const pushForm = reactive({
  type: 'now',
  scheduledTime: '',
  target: 'all',
  userIds: '',
  title: '',
  content: '',
  url: '',
  platforms: ['Web Browser', 'iOS App', 'Android App']
})

const sending = ref(false)
const previewVisible = ref(false)

// 模拟历史数据
const historyData = ref([
  { date: '2023-10-27 10:00:00', title: '双十一活动预热开启！', target: '全部用户', status: '成功' },
  { date: '2023-10-26 15:30:00', title: '您的会员即将到期提醒', target: 'VIP 用户组', status: '成功' },
  { date: '2023-10-25 09:00:00', title: '系统维护通知', target: '全部用户', status: '失败' },
  { date: '2023-10-28 11:00:00', title: '周末特惠活动', target: '活跃用户', status: '发送中' },
])

// 提交按钮点击事件
const onSubmit = () => {
  if (!pushForm.title || !pushForm.content) {
    ElMessage.error('请填写标题和内容')
    return
  }

  sending.value = true
  // 模拟发送请求延时
  setTimeout(() => {
    sending.value = false
    ElMessage.success('模拟发送成功！消息已加入队列。')
    // 模拟添加一条新的历史记录
    historyData.value.unshift({
        date: new Date().toLocaleString(),
        title: pushForm.title,
        target: getTargetLabel(pushForm.target),
        status: '发送中'
    })
  }, 1500)
}

// 保存草稿事件
const onSaveDraft = () => {
  ElMessage.info('草稿已保存（模拟）')
}

// 显示预览
const showPreview = () => {
    previewVisible.value = true
    // 也可以用 Element Plus 的 Notification 组件来模拟 Web Push
    // ElNotification({
    //   title: pushForm.title || '预览标题',
    //   message: pushForm.content || '预览内容...',
    //   type: 'info',
    // })
}

// 辅助函数：获取目标用户标签
const getTargetLabel = (value) => {
    const map = {
        'all': '全部用户',
        'vip': 'VIP 用户组',
        'active_l7d': '最近活跃用户',
        'specific': '指定用户'
    }
    return map[value] || value
}
</script>

<style scoped>
.push-demo-container {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.box-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-card {
    margin-top: 30px;
}

/* 简单的通知预览样式 */
.notification-preview {
    border: 1px solid #eee;
    border-radius: 8px;
    padding: 15px;
    background-color: #fff;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.preview-header {
    display: flex;
    align-items: center;
    font-size: 12px;
    color: #666;
    margin-bottom: 10px;
}

.app-icon {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    margin-right: 8px;
}

.time {
    margin-left: auto;
}

.preview-title {
    font-weight: bold;
    font-size: 16px;
    margin-bottom: 5px;
    color: #333;
}

.preview-body {
    font-size: 14px;
    color: #555;
    white-space: pre-wrap; /* 保留换行 */
}
</style>