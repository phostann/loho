export interface IHomeFeed {
    xsec_token: string
    id: string
    model_type: string
    note_card: {
        cover: {
            url_pre: string
            url_default: string
            file_id: string
            height: number
            width: number
            url: string
            info_list: Array<{
                image_scene: string
                url: string
            }>
        }
        type: string
        display_title: string
        user: {
            user_id: string
            nickname: string
            nick_name: string
            avatar: string
        }
        interact_info: {
            liked: boolean
            liked_count: string
        }
    }
    track_id: string
    ignore: boolean
}
