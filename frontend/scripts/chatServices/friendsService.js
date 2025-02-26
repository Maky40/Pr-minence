// friendsService.js
import api from "../../services/api.js";
import Toast from "../../components/toast.js";
import { updateFriendsList } from "./uiService.js";


/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║                  SEARCH FOR DROP DOWN LIST                 ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////


export async function searchFriends(query) {
	if (query.length < 3) {
		return [];
	}
	return await api.apiFetch("/player/search-players/?username=" + query, true, "GET");
}



/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║                       ADD FRIEND BUTTON                    ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////

export async function addFriend(friendName, friendsList) {
	try {
		const response_id = await api.apiFetch("/player/?username=" + friendName, true, "GET");
		if (response_id.status === 404 || response_id.status === 500) {
			const toast = new Toast("Error", "L'utilisateur n'existe pas", "error");
			toast.show();
			return;
		}
		await requestFriend(response_id.players[0].id, friendsList);
	} catch (error) {
		console.error("Erreur API :", error);
	}
}


/////////////////////////////////////////////╔════════════════════════════════════════════════════════════╗/////////////////////////////////////////////
/////////////////////////////////////////////║            SEND/ACCEPT/DELETE FRIEND INVITATION            ║/////////////////////////////////////////////
/////////////////////////////////////////////╚════════════════════════════════════════════════════════════╝/////////////////////////////////////////////

export async function requestFriend(id, friendsList) {
	const request_id = { "target_id": id };
	const response_add = await api.apiFetch("/player/friendship/", true, "POST", request_id);
	if (response_add.status !== 200) {
		const toast = new Toast("Error", response_add.message, "error");
		toast.show();
		return;
	}
	const toast = new Toast("Success", response_add.message, "success");
	toast.show();
	updateFriendsList(friendsList);
}

export async function deleteFriend(id) {
	const request_id = { "target_id": id };
	const response_add = await api.apiFetch("/player/friendship/", true, "DELETE", request_id);
	if (response_add.status !== 200) {
		const toast = new Toast("Error", response_add.message, "error");
		toast.show();
		return;
	}
	const toast = new Toast("Success", "Demande d'ajout refusee", "success");
	toast.show();
}